import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useLocation } from "react-router";
import type { Commands, Result, Services, ViewData } from "../services/contracts.ts";
import { pushReminders } from "../services/reminders.ts";

interface Settings {
  distance: number | "all";
  setDistance: (value: number | "all") => void;
}
export interface UI extends Settings {
  data: ViewData;
  mode: Services["mode"];
  run: Services["run"];
  read: Services["read"];
  dialog: (contents: ReactNode) => void;
  close: () => void;
  notify: (text: string, undo?: () => Promise<unknown>) => void;
}
export const Context = createContext<UI | null>(null);
export function useUI() {
  const ui = useContext(Context);
  if (!ui) throw new Error("FreshSave view requires the app shell.");
  return ui;
}

export function Provider({ services, children }: { services: Services; children: ReactNode }) {
  const location = useLocation();
  const [distance, setDistance] = useState<Settings["distance"]>(5);
  const [revision, setRevision] = useState(0);
  const [view, setView] = useState<{ key: string; data: ViewData }>();
  const [error, setError] = useState("");
  const [modal, setModal] = useState<ReactNode>(null);
  const [notices, setNotices] = useState<
    { id: string; text: string; undo?: () => Promise<unknown> }[]
  >([]);
  const priorFocus = useRef<HTMLElement | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const key = location.pathname + location.search;
  const retailerDashboard =
    location.pathname === "/dashboard" && view?.data.session?.user.role === "retailer";
  const refresh = () => setRevision((value) => value + 1);

  useEffect(() => services.subscribe(refresh), [services]);
  useEffect(() => {
    window.addEventListener("focus", refresh);
    const reservationScreen = /^\/reservations?(?:\/|$)/.test(location.pathname);
    const timer =
      services.mode === "demo" || reservationScreen || retailerDashboard
        ? setInterval(
            () => {
              if (!document.hidden) refresh();
            },
            services.mode === "demo" ? 60_000 : 30_000,
          )
        : undefined;
    return () => {
      window.removeEventListener("focus", refresh);
      clearInterval(timer);
    };
  }, [services, location.pathname, retailerDashboard]);
  useEffect(() => {
    const [, page = "", id] = location.pathname.split("/");
    const params = new URLSearchParams(location.search);
    let active = true;
    services
      .read({
        page,
        id,
        params,
        distance,
        search: params.get("q") || "",
        offset: Number(params.get("offset")) || 0,
      })
      .then((data) => {
        if (active) {
          setView({ key, data });
          setError("");
          pushReminders(data.notifs);
        }
      })
      .catch((cause) => {
        if (active)
          setError(cause instanceof Error ? cause.message : "FreshSave could not load this page.");
      });
    return () => {
      active = false;
    };
  }, [services, key, distance, revision, location.pathname, location.search]);

  function close() {
    setModal(null);
    const focus = priorFocus.current;
    if (focus?.isConnected) focus.focus();
    priorFocus.current = null;
  }
  useEffect(() => {
    setModal(null);
    priorFocus.current = null;
    window.scrollTo(0, 0);
  }, [location.pathname]);

  useEffect(() => {
    if (!modal) return;
    const target = dialogRef.current;
    if (!target) return;
    const focusable = () =>
      Array.from(
        target.querySelectorAll<HTMLElement>(
          "button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], summary",
        ),
      ).filter((element) => element.offsetParent);
    const fields = focusable();
    (
      fields.find((element) =>
        element.matches("input:not([type=checkbox]):not([type=radio]),textarea,select"),
      ) ||
      fields[0] ||
      target
    ).focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      }
      if (event.key !== "Tab") return;
      const fields = focusable(),
        first = fields[0],
        last = fields[fields.length - 1];
      if (event.shiftKey && document.activeElement === first && last) {
        event.preventDefault();
        last.focus();
      }
      if (!event.shiftKey && document.activeElement === last && first) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [modal]);

  function notify(text: string, undo?: () => Promise<unknown>) {
    const id = crypto.randomUUID();
    setNotices((items) => [
      ...(undo ? items : items.filter((notice) => notice.undo)),
      { id, text, undo },
    ]);
    setTimeout(
      () => setNotices((items) => items.filter((item) => item.id !== id)),
      undo ? 8000 : 3400,
    );
  }

  async function run<K extends keyof Commands>(
    name: K,
    input: Commands[K]["input"],
  ): Promise<Result<Commands[K]["output"]>> {
    return services.run(name, input);
  }

  if (error)
    return (
      <div className="empty" role="alert">
        <h1>Could not load FreshSave</h1>
        <p>{error}</p>
        <button
          className="btn"
          onClick={() => {
            setError("");
            refresh();
          }}
        >
          Retry
        </button>
      </div>
    );
  if (!view || view.key.split("?")[0] !== location.pathname)
    return (
      <main aria-busy="true">
        <p className="wrap py-8">Loading FreshSave…</p>
      </main>
    );
  return (
    <Context.Provider
      value={{
        data: view.data,
        mode: services.mode,
        distance,
        setDistance,
        run,
        read: services.read,
        close,
        notify,
        dialog: (contents) => {
          if (!modal)
            priorFocus.current =
              document.activeElement instanceof HTMLElement ? document.activeElement : null;
          setModal(contents);
        },
      }}
    >
      {children}
      <div
        className={"ov" + (modal ? " open" : "")}
        id="ov"
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
        }}
      >
        <div
          className="modal wide"
          id="modal"
          tabIndex={-1}
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={modal ? "m-title" : undefined}
        >
          {modal}
        </div>
      </div>
      <div className="toasts" id="toasts" role="status" aria-live="polite">
        {notices.map((item) => (
          <div key={item.id} className={item.undo ? "toast has-undo" : "toast"}>
            <span>{item.text}</span>
            {item.undo && (
              <button
                onClick={async () => {
                  setNotices((items) => items.filter((notice) => notice.id !== item.id));
                  await item.undo?.();
                }}
              >
                Undo
              </button>
            )}
          </div>
        ))}
      </div>
    </Context.Provider>
  );
}
