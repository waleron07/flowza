import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "@mui/material";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TurnstileInstance } from "@marsidev/react-turnstile";
import { RegisterPage } from "./RegisterPage";
import {
  looksLikeInvalidTurnstileClientToken,
  resolveTurnstileTokenForSubmit,
  resolveTurnstileTokenForSubmitAsync,
} from "./captcha/register-captcha";
import { theme } from "../../../app/theme";
import { useAuth } from "../../../features/auth/model/useAuth";
import * as authApi from "../../../features/auth/api/authApi";

const mockedNavigate = vi.hoisted(() => vi.fn());

vi.mock("../../../features/auth/model/useAuth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../../../features/auth/api/authApi", () => ({
  verifyEmailRequest: vi.fn(),
  resendEmailCodeRequest: vi.fn(),
}));

vi.mock("react-router-dom", async () => {
  const actual =
    await vi.importActual<typeof import("react-router-dom")>(
      "react-router-dom",
    );

  return {
    ...actual,
    useNavigate: () => mockedNavigate,
  };
});

const mockedUseAuth = vi.mocked(useAuth);
const mockedVerifyEmail = vi.mocked(authApi.verifyEmailRequest);
const mockedApplyAuthSession = vi.fn();

function renderRegisterPage(initialEntry = "/register") {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <RegisterPage />
      </MemoryRouter>
    </ThemeProvider>,
  );
}

describe("капча (Turnstile): вспомогательные функции", () => {
  describe("looksLikeInvalidTurnstileClientToken", () => {
    it("считает невалидными пустую строку и пробелы", () => {
      expect(looksLikeInvalidTurnstileClientToken("")).toBe(true);
      expect(looksLikeInvalidTurnstileClientToken("   ")).toBe(true);
    });

    it("принимает официальный тестовый ответ Cloudflare XXXX.DUMMY.TOKEN.XXXX", () => {
      expect(
        looksLikeInvalidTurnstileClientToken("XXXX.DUMMY.TOKEN.XXXX"),
      ).toBe(false);
    });

    it("отклоняет прочие подделки с XXXX.DUMMY и короткие dummy", () => {
      expect(
        looksLikeInvalidTurnstileClientToken("XXXX.DUMMY.TOKEN.other"),
      ).toBe(true);
      expect(looksLikeInvalidTurnstileClientToken("prefix-dummy-suffix")).toBe(
        true,
      );
    });

    it("отклоняет слишком короткие строки (меньше 8 символов)", () => {
      expect(looksLikeInvalidTurnstileClientToken("x".repeat(7))).toBe(true);
    });

    it("принимает токен от 8 символов без признаков заглушки", () => {
      expect(looksLikeInvalidTurnstileClientToken("x".repeat(8))).toBe(false);
      expect(
        looksLikeInvalidTurnstileClientToken(
          "0".repeat(200) + "." + "1".repeat(200) + "." + "2".repeat(200),
        ),
      ).toBe(false);
    });

    it("не отклоняет длинную строку со случайной подстрокой dummy", () => {
      expect(
        looksLikeInvalidTurnstileClientToken(
          "a".repeat(100) + "dummy" + "b".repeat(100),
        ),
      ).toBe(false);
    });
  });

  describe("resolveTurnstileTokenForSubmit", () => {
    it("без виджета возвращает значение из формы", () => {
      const ref = { current: null };
      expect(
        resolveTurnstileTokenForSubmit("mock-captcha-token", ref, false),
      ).toBe("mock-captcha-token");
    });

    it("с виджетом отдаёт приоритет getResponse() из ref", () => {
      const longToken = `a${"b".repeat(90)}`;
      const ref = {
        current: {
          getResponse: () => longToken,
        } as unknown as TurnstileInstance,
      };
      expect(
        resolveTurnstileTokenForSubmit("stale-from-formik", ref, true),
      ).toBe(longToken);
    });

    it("если getResponse нет — использует значение формы", () => {
      const ref = { current: null };
      expect(resolveTurnstileTokenForSubmit("only-form", ref, true)).toBe(
        "only-form",
      );
    });
  });

  describe("resolveTurnstileTokenForSubmitAsync", () => {
    it("при пустом синхронном ответе ждёт getResponsePromise", async () => {
      const longToken = `t${"k".repeat(120)}`;
      const ref = {
        current: {
          getResponse: () => "",
          getResponsePromise: async () => longToken,
        } as unknown as TurnstileInstance,
      };
      await expect(
        resolveTurnstileTokenForSubmitAsync("", ref, true),
      ).resolves.toBe(longToken);
    });
  });
});

describe("Страница регистрации", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  beforeEach(() => {
    mockedNavigate.mockReset();
    mockedApplyAuthSession.mockReset();
    mockedVerifyEmail.mockReset();
    mockedUseAuth.mockReturnValue({
      status: "guest",
      user: null,
      login: vi.fn(),
      register: vi.fn(),
      applyAuthSession: mockedApplyAuthSession,
      logout: vi.fn(),
      deleteAccount: vi.fn(),
    });
  });

  it("требует согласие с политикой и обязательные поля", async () => {
    const user = userEvent.setup();

    renderRegisterPage();

    await user.click(
      screen.getByRole("button", { name: /зарегистрироваться/i }),
    );

    expect(
      await screen.findByText(/введите номер телефона/i),
    ).toBeInTheDocument();
    expect(await screen.findByText(/введите логин/i)).toBeInTheDocument();
    expect(await screen.findByText(/введите email/i)).toBeInTheDocument();
    expect(await screen.findByText(/введите пароль/i)).toBeInTheDocument();
    expect(
      await screen.findByText(
        /нужно согласиться с политикой конфиденциальности/i,
      ),
    ).toBeInTheDocument();
    expect(
      await screen.findByText(
        /нужно согласиться с обработкой персональных данных/i,
      ),
    ).toBeInTheDocument();
    expect(
      await screen.findByText(/подтвердите, что вы не робот/i),
    ).toBeInTheDocument();
  });

  it("после регистрации запрашивает код и после подтверждения перенаправляет по redirectTo", async () => {
    const user = userEvent.setup();
    const register = vi.fn().mockResolvedValue({
      success: true,
      message: "Verification code sent to email",
      verificationRequired: true,
      verificationTtlSec: 900,
      resendAvailableInSec: 60,
    });

    mockedVerifyEmail.mockResolvedValue({
      accessToken: "jwt.test",
      user: {
        id: 1,
        phone: "+79991234567",
        login: "ivan_user",
        role: "user",
        email: "ivan@example.com",
        primaryTenantId: null,
        organizationIds: [],
      },
    });

    mockedUseAuth.mockReturnValue({
      status: "guest",
      user: null,
      login: vi.fn(),
      register,
      applyAuthSession: mockedApplyAuthSession,
      logout: vi.fn(),
      deleteAccount: vi.fn(),
    });

    renderRegisterPage("/register?redirectTo=/checkout");

    await user.type(screen.getByLabelText(/телефон/i), "+79991234567");
    await user.type(screen.getByLabelText(/логин/i), "ivan_user");
    await user.type(screen.getByLabelText(/email/i), "ivan@example.com");
    await user.type(screen.getByLabelText(/^пароль$/i), "strongpass");
    await user.click(
      screen.getByRole("checkbox", { name: /политикой конфиденциальности/i }),
    );
    await user.click(
      screen.getByRole("checkbox", { name: /обработкой персональных данных/i }),
    );
    await user.click(screen.getByRole("checkbox", { name: /я не робот/i }));
    await user.click(
      screen.getByRole("button", { name: /зарегистрироваться/i }),
    );

    expect(register).toHaveBeenCalledWith({
      phone: "+79991234567",
      login: "ivan_user",
      email: "ivan@example.com",
      password: "strongpass",
      consentToPrivacyPolicy: true,
      consentToPersonalData: true,
      agreementVersion: "2026-04-04",
      captchaToken: "mock-captcha-token",
    });

    expect(await screen.findByText(/подтвердите email/i)).toBeInTheDocument();

    await user.type(screen.getByLabelText(/код из письма/i), "123456");
    await user.click(screen.getByRole("button", { name: /^подтвердить$/i }));

    expect(mockedVerifyEmail).toHaveBeenCalledWith({
      email: "ivan@example.com",
      code: "123456",
    });

    expect(
      await screen.findByText(/регистрация прошла успешно/i),
    ).toBeInTheDocument();

    await waitFor(
      () => {
        expect(mockedApplyAuthSession).toHaveBeenCalledWith(
          expect.objectContaining({ accessToken: "jwt.test" }),
        );
        expect(mockedNavigate).toHaveBeenCalledWith("/checkout", {
          replace: true,
        });
      },
      { timeout: 4000 },
    );
  });

  it("показывает backend ошибку при неуспешной регистрации", async () => {
    const user = userEvent.setup();
    const register = vi
      .fn()
      .mockRejectedValue(new Error("Пользователь уже существует"));

    mockedUseAuth.mockReturnValue({
      status: "guest",
      user: null,
      login: vi.fn(),
      register,
      applyAuthSession: mockedApplyAuthSession,
      logout: vi.fn(),
      deleteAccount: vi.fn(),
    });

    renderRegisterPage();

    await user.type(screen.getByLabelText(/телефон/i), "+79991234567");
    await user.type(screen.getByLabelText(/логин/i), "ivan_user");
    await user.type(screen.getByLabelText(/email/i), "ivan@example.com");
    await user.type(screen.getByLabelText(/^пароль$/i), "strongpass");
    await user.click(
      screen.getByRole("checkbox", { name: /политикой конфиденциальности/i }),
    );
    await user.click(
      screen.getByRole("checkbox", { name: /обработкой персональных данных/i }),
    );
    await user.click(screen.getByRole("checkbox", { name: /я не робот/i }));
    await user.click(
      screen.getByRole("button", { name: /зарегистрироваться/i }),
    );

    expect(
      await screen.findByText(/пользователь уже существует/i),
    ).toBeInTheDocument();
    expect(mockedNavigate).not.toHaveBeenCalled();
  });
});
