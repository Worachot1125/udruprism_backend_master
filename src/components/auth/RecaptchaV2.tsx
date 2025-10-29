/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
// src/components/auth/RecaptchaV2.tsx
"use client";

import React from "react";

type Props = {
  siteKey: string;
  onVerify: (token: string) => void;
  onExpired?: () => void;
  theme?: "light" | "dark";
  className?: string;
};

declare global {
  interface Window {
    grecaptcha?: any;
    ___recaptchaOnLoad___?: () => void;
  }
}

export default function RecaptchaV2({
  siteKey,
  onVerify,
  onExpired,
  theme = "light",
  className,
}: Props) {
  const boxRef = React.useRef<HTMLDivElement | null>(null);
  const widgetId = React.useRef<number | null>(null);
  const [ready, setReady] = React.useState(false);
  const [loadErr, setLoadErr] = React.useState<string | null>(null);

  const onVerifyRef = React.useRef(onVerify);
  const onExpiredRef = React.useRef(onExpired);
  React.useEffect(() => {
    onVerifyRef.current = onVerify;
    onExpiredRef.current = onExpired;
  }, [onVerify, onExpired]);

  const renderCaptcha = React.useCallback(() => {
    if (!boxRef.current || !window.grecaptcha || widgetId.current !== null) return;
    try {
      widgetId.current = window.grecaptcha.render(boxRef.current, {
        sitekey: siteKey,
        theme,
        callback: (token: string) => onVerifyRef.current?.(token),
        "expired-callback": () => onExpiredRef.current?.(),
      });
    } catch (e) {
      setLoadErr("Failed to render reCAPTCHA");
    }
  }, [siteKey, theme]);

  // โหลดสคริปต์แบบ manual เพื่อลดโอกาส timeout จาก next/script
  React.useEffect(() => {
    if (typeof window === "undefined") return;

    // ถ้ามีอยู่แล้วไม่ต้องโหลดซ้ำ
    if (window.grecaptcha && typeof window.grecaptcha.render === "function") {
      setReady(true);
      renderCaptcha();
      return;
    }

    const url =
      "https://www.google.com/recaptcha/api.js?onload=___recaptchaOnLoad___&render=explicit";

    // ป้องกันโหลดซ้ำ
    if (document.querySelector<HTMLScriptElement>('script[data-recaptcha="v2"]')) {
      return;
    }

    window.___recaptchaOnLoad___ = () => {
      setReady(true);
      renderCaptcha();
    };

    const s = document.createElement("script");
    s.src = url;
    s.async = true;
    s.defer = true;
    s.dataset.recaptcha = "v2";
    s.onerror = () => setLoadErr("Unable to load reCAPTCHA script");
    document.head.appendChild(s);

    // safety timeout 12s
    const t = window.setTimeout(() => {
      if (!window.grecaptcha) setLoadErr("Loading reCAPTCHA took too long");
    }, 12000);

    return () => {
      window.clearTimeout(t);
      // ไม่ถอดสคริปต์ทิ้ง เพื่อให้กลับมาหน้านี้แล้วเร็วขึ้น
      window.___recaptchaOnLoad___ = undefined;
    };
  }, [renderCaptcha]);

  return (
    <div className={className}>
      {!loadErr ? (
        <div ref={boxRef} />
      ) : (
        <div className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          reCAPTCHA error: {loadErr} &nbsp;
          <button
            type="button"
            className="underline"
            onClick={() => {
              setLoadErr(null);
              setReady(false);
              widgetId.current = null;
              // ลอง render ใหม่
              if (window.grecaptcha) {
                setReady(true);
                setTimeout(renderCaptcha, 0);
              } else {
                // ลบตัวบ่งชี้ script เพื่อให้ effect โหลดใหม่
                const el = document.querySelector('script[data-recaptcha="v2"]');
                if (el) el.remove();
                setTimeout(() => {
                  // trigger effect ใหม่ด้วยการ set state
                  setReady((v) => !v);
                }, 50);
              }
            }}
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
