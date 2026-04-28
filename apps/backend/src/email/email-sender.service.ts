import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';
import { EmailTemplateService } from './email-template.service';

@Injectable()
export class EmailSenderService {
  private readonly logger = new Logger(EmailSenderService.name);
  private readonly smtpEnabled: boolean;
  private readonly fromAddress: string;
  private readonly smtpRetryCount: number;
  private readonly smtpRetryDelayMs: number;
  private transporter: Transporter | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly emailTemplateService: EmailTemplateService,
  ) {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = Number(this.configService.get<string>('SMTP_PORT') ?? '587');
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');
    const secure = this.configService.get<string>('SMTP_SECURE') === 'true';
    const from = this.configService.get<string>('SMTP_FROM');
    const connectionTimeoutMs = this.getNonNegativeIntFromEnv(
      'SMTP_CONNECTION_TIMEOUT_MS',
      10000,
    );
    const greetingTimeoutMs = this.getNonNegativeIntFromEnv(
      'SMTP_GREETING_TIMEOUT_MS',
      10000,
    );
    const socketTimeoutMs = this.getNonNegativeIntFromEnv(
      'SMTP_SOCKET_TIMEOUT_MS',
      20000,
    );

    this.smtpEnabled = Boolean(host && port && user && pass && from);
    this.fromAddress = from ?? 'no-reply@flowza.local';
    this.smtpRetryCount = this.getNonNegativeIntFromEnv('SMTP_RETRY_COUNT', 2);
    this.smtpRetryDelayMs = this.getNonNegativeIntFromEnv(
      'SMTP_RETRY_DELAY_MS',
      500,
    );

    if (this.smtpEnabled) {
      const options: SMTPTransport.Options = {
        host,
        port,
        secure,
        connectionTimeout: connectionTimeoutMs,
        greetingTimeout: greetingTimeoutMs,
        socketTimeout: socketTimeoutMs,
        auth: {
          user,
          pass,
        },
      };
      // Яндекс и часть других провайдеров: 587 + STARTTLS (не SSL с первого байта)
      if (!secure && port === 587) {
        options.requireTLS = true;
      }
      this.transporter = createTransport(options);
    } else if (process.env.NODE_ENV !== 'test') {
      this.logger.warn(
        'SMTP не настроен. Коды подтверждения будут выводиться в логи вместо отправки письмом.',
      );
    }
  }

  private getNonNegativeIntFromEnv(key: string, fallback: number): number {
    const rawValue = this.configService.get<string>(key);
    const parsed = Number(rawValue);

    if (!rawValue || !Number.isInteger(parsed) || parsed < 0) {
      return fallback;
    }

    return parsed;
  }

  private isSmtpAuthError(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
      return false;
    }
    const e = error as Record<string, unknown>;
    return e.code === 'EAUTH' || e.responseCode === 535;
  }

  /** Текст для логов: код ответа SMTP, команда, ответ сервера (без пароля). */
  private formatSmtpError(error: unknown): string {
    if (!error || typeof error !== 'object') {
      return String(error);
    }
    const e = error as Record<string, unknown> & { message?: string };
    const parts: string[] = [];
    if (typeof e.code === 'string') {
      parts.push(`code=${e.code}`);
    }
    if (typeof e.responseCode === 'number') {
      parts.push(`responseCode=${e.responseCode}`);
    }
    if (typeof e.response === 'string') {
      parts.push(`response=${e.response.trim()}`);
    }
    if (typeof e.command === 'string') {
      parts.push(`command=${e.command}`);
    }
    if (e.message) {
      parts.push(`message=${e.message}`);
    }
    return parts.length > 0 ? parts.join(' | ') : JSON.stringify(error);
  }

  private async wait(ms: number): Promise<void> {
    if (ms <= 0) {
      return;
    }
    await new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  /**
   * @returns sentViaSmtp — false, если SMTP не настроен: код только в логах сервера, не в почте.
   */
  async sendVerificationCode(params: {
    email: string;
    code: string;
    ttlMinutes: number;
  }): Promise<{ sentViaSmtp: boolean }> {
    const template = this.emailTemplateService.buildVerificationCodeEmail({
      code: params.code,
      ttlMinutes: params.ttlMinutes,
    });

    if (!this.smtpEnabled || !this.transporter) {
      this.logger.log(
        `${template.subject}. Код подтверждения для ${params.email}: ${params.code} (действует ${params.ttlMinutes} мин.)`,
      );
      return { sentViaSmtp: false };
    }

    const maxAttempts = this.smtpRetryCount + 1;
    let lastError: unknown = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        await this.transporter.sendMail({
          from: this.fromAddress,
          to: params.email,
          subject: template.subject,
          text: template.text,
          html: template.html,
        });
        return { sentViaSmtp: true };
      } catch (error) {
        lastError = error;
        const isLastAttempt = attempt === maxAttempts;
        if (isLastAttempt) {
          break;
        }
        this.logger.warn(
          `Не удалось отправить письмо подтверждения (попытка ${attempt}/${maxAttempts}) для ${params.email}: ${this.formatSmtpError(error)}. Повтор через ${this.smtpRetryDelayMs}мс.`,
        );
        await this.wait(this.smtpRetryDelayMs);
      }
    }

    this.logger.error(
      `Не удалось отправить код подтверждения на ${params.email} после ${maxAttempts} попыток: ${this.formatSmtpError(lastError)}`,
      lastError instanceof Error ? lastError.stack : undefined,
    );
    if (this.isSmtpAuthError(lastError)) {
      throw new InternalServerErrorException(
        'Ошибка SMTP-аутентификации: неверный логин или пароль. Для Яндекса используйте полный email в SMTP_USER, а в SMTP_PASS — пароль приложения, если включена 2FA (Яндекс ID → Безопасность → Пароли приложений).',
      );
    }
    throw new InternalServerErrorException(
      'Не удалось отправить письмо с подтверждением',
    );
  }
}
