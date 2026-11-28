import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { LOCATIONS, photo } from "../data.js";
import type { Role } from "../domain/model.ts";
import { Avatar, Button, Check, Field, Note } from "./primitives.tsx";
import { useUI } from "./state.tsx";

export function Brand({ light = false, to = "/market" }: { light?: boolean; to?: string }) {
  return (
    <Link className={"logo" + (light ? " inv" : "")} to={to} aria-label="FreshSave home">
      <i>
        <svg className="ico" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 19c0-8 5-13 16-15-1 11-6 16-13 16H4zM5 19l10-10" />
        </svg>
      </i>
      <span>
        Fresh<b>Save</b>
      </span>
    </Link>
  );
}

export function Auth({ page }: { page: "login" | "register" | "forgot" }) {
  const { run, mode, data } = useUI();
  const navigate = useNavigate(),
    location = useLocation();
  const [role, setRole] = useState<Role>("individual"),
    [error, setError] = useState(""),
    [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const demoRecovery = page === "forgot" && mode === "demo";
  useEffect(() => {
    if (
      data.session && // Keep the new-account destination from the submit handler.
      !busy
    )
      navigate(data.session.user.role === "retailer" ? "/dashboard" : "/market", { replace: true });
  }, [data.session?.user.id, busy, navigate]);
  useEffect(() => {
    setError("");
    setSent(false);
  }, [location.pathname]);

  async function signIn(email: string, password: string, keep: boolean) {
    setBusy(true);
    setError("");
    const result = await run("login", { email, password, keep });
    if (result.ok)
      navigate(result.value.user.role === "retailer" ? "/dashboard" : "/market", { replace: true });
    else setError(result.error.message);
    setBusy(false);
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget),
      get = (name: string) => String(fields.get(name) || "");
    const email = get("email");
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError("Enter a valid email address.");
      return;
    }
    if (page === "login") {
      await signIn(email, get("pw"), fields.has("keep"));
      return;
    }
    if (page === "forgot") {
      const result = await run("resetPassword", { email });
      if (result.ok) setSent(true);
      else setError(result.error.message);
      return;
    }
    if (!fields.has("consent")) {
      setError("Please confirm to continue.");
      return;
    }
    setBusy(true);
    setError("");
    const result = await run("register", {
      email,
      name: get("name"),
      password: get("pw"),
      role,
      loc: get("loc"),
      store: get("store"),
      address: get("address"),
    });
    if (result.ok) navigate("/dashboard", { replace: true });
    else setError(result.error.message);
    setBusy(false);
  }
  const field = (name: string, label: string, type = "text") => (
    <Field id={"a-" + name} label={label}>
      <input id={"a-" + name} name={name} type={type} />
    </Field>
  );
  return (
    <div className="auth">
      <aside
        className="auth-brand"
        style={{
          backgroundImage: `linear-gradient(180deg,#cc4a30e8,#cc4a30d4 45%,#9e3822f5),url('${photo("aisle", 0, 900)}')`,
        }}
      >
        <Brand light to="/login" />
        <div>
          <h2>Know what’s in your kitchen. Find sealed surplus food nearby.</h2>
          <ul>
            <li>
              <span>
                <b>Track</b> – expiry dates and in-app reminders for food you own
              </span>
            </li>
            <li>
              <span>
                <b>Rescue</b> – reserve sealed surplus, collect and pay in person
              </span>
            </li>
          </ul>
        </div>
        <small>FreshSave · Kuala Lumpur &amp; Selangor</small>
      </aside>
      <section className="auth-main">
        <div className="auth-card">
          <div className="protonote">
            <span>
              Sample sellers are fictional.{" "}
              <Link className="link" to="/about">
                About FreshSave
              </Link>
            </span>
          </div>
          <h1>
            {page === "login"
              ? "Log in"
              : page === "register"
                ? "Create your account"
                : "Reset password"}
          </h1>
          {page === "login" && mode === "demo" && (
            <div className="demo" id="demo-accounts">
              <h2>Try a demo account</h2>
              {[
                ["aisyah@freshsave.my", "Aisyah Rahman", "Continue as demo buyer"],
                ["pakdin@freshsave.my", "Kedai Runcit Pak Din", "Continue as demo retailer"],
              ].map(([email, name, label]) => (
                <Button
                  className="demo-acc"
                  key={email}
                  act="demo"
                  data-e={email}
                  disabled={busy}
                  onClick={() => {
                    void signIn(email, "demo1234", true);
                  }}
                >
                  <Avatar name={name} />
                  <span>
                    <b>{label}</b>
                    <small>{name}</small>
                  </span>
                </Button>
              ))}
              <p className="mute sm">
                Demo password: demo1234. Accounts exist only in this browser.
              </p>
            </div>
          )}
          {demoRecovery && (
            <Note danger>Demo only. No email is sent and passwords can’t be recovered.</Note>
          )}
          {demoRecovery ? null : sent ? (
            <Note>If this account exists, check the local mail inbox for reset instructions.</Note>
          ) : (
            <form id={"f-" + page} noValidate onSubmit={submit}>
              {page === "register" && (
                <>
                  <p className="mute">Choose how you’ll use FreshSave.</p>
                  <div className="roles" role="radiogroup" aria-label="Account role">
                    {(["individual", "retailer"] as const).map((value) => (
                      <Button
                        key={value}
                        act="role"
                        data-r={value}
                        className={"role" + (value === role ? " on" : "")}
                        role="radio"
                        aria-checked={value === role}
                        onClick={() => setRole(value)}
                      >
                        <b>{value === "individual" ? "Individual" : "Retailer"}</b>
                        <small>
                          {value === "individual"
                            ? "Track food at home and reserve surplus."
                            : "Record stock and offer sealed food."}
                        </small>
                      </Button>
                    ))}
                  </div>
                  {field("name", role === "retailer" ? "Contact person name" : "Full name")}
                  {role === "retailer" && field("store", "Store name")}
                </>
              )}
              {field("email", "Email", "email")}
              {page !== "forgot" && field("pw", "Password", "password")}
              {page === "login" && (
                <div className="auth-row">
                  <Check name="keep" defaultChecked>
                    Keep me logged in
                  </Check>
                  <Link className="link sm" to="/forgot">
                    Forgot password?
                  </Link>
                </div>
              )}
              {page === "register" && (
                <>
                  {mode === "demo" && (
                    <p className="hint">
                      Use a throwaway password. Demo passwords are stored in plain text.
                    </p>
                  )}
                  <Field
                    id="a-loc"
                    label={role === "retailer" ? "Store neighbourhood" : "Preferred location"}
                  >
                    <select name="loc" id="a-loc">
                      {LOCATIONS.map((area) => (
                        <option key={area.id} value={area.id}>
                          {area.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  {role === "retailer" && (
                    <>
                      {field("address", "Registered store / pickup address")}
                      <Note danger>
                        Anyone can register as a retailer here. Sellers are unverified in this
                        prototype.
                      </Note>
                    </>
                  )}
                  <Check id="a-consent" name="consent">
                    I understand this is a local test environment and I’ll use test data.
                  </Check>
                </>
              )}
              {error && (
                <div id="loginerr" className="formerr" role="alert">
                  {error}
                </div>
              )}
              <Button disabled={busy} type="submit" className="btn block">
                {page === "login" ? "Log in" : page === "register" ? "Create account" : "Continue"}
              </Button>
            </form>
          )}
          <p className="auth-alt">
            {page === "login" ? (
              <>
                New to FreshSave?{" "}
                <Link className="link" to="/register">
                  Create an account
                </Link>
              </>
            ) : (
              <Link className="link" to="/login">
                {demoRecovery ? "Back to demo accounts" : "Back to log in"}
              </Link>
            )}
          </p>
        </div>
      </section>
    </div>
  );
}
