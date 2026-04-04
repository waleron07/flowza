import { Injectable } from '@nestjs/common';

export type VerificationEmailTemplateParams = {
  code: string;
  ttlMinutes: number;
};

export type VerificationEmailTemplate = {
  subject: string;
  text: string;
  html: string;
};

@Injectable()
export class EmailTemplateService {
  buildVerificationCodeEmail(
    params: VerificationEmailTemplateParams,
  ): VerificationEmailTemplate {
    const subject = 'Flowza: код подтверждения email';
    const text = [
      'Здравствуйте!',
      '',
      `Ваш код подтверждения: ${params.code}`,
      `Код действует ${params.ttlMinutes} минут.`,
      '',
      'Если вы не запрашивали регистрацию в Flowza, просто проигнорируйте это письмо.',
    ].join('\n');
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #111827;">
        <h2 style="margin-bottom: 12px;">Подтверждение email в Flowza</h2>
        <p style="margin-top: 0;">Здравствуйте!</p>
        <p>Используйте код ниже, чтобы завершить регистрацию:</p>
        <div style="font-size: 28px; font-weight: 700; letter-spacing: 6px; padding: 16px 20px; border: 1px solid #e5e7eb; border-radius: 8px; display: inline-block;">
          ${params.code}
        </div>
        <p style="margin-top: 16px;">Код действует <strong>${params.ttlMinutes} минут</strong>.</p>
        <p style="color: #6b7280; font-size: 14px;">
          Если вы не запрашивали регистрацию в Flowza, просто проигнорируйте это письмо.
        </p>
      </div>
    `.trim();

    return {
      subject,
      text,
      html,
    };
  }
}
