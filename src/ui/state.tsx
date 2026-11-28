import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useLocation } from "react-router";
import type { Commands, Result, Services, ViewData } from "../services/contracts.ts";
import { showDeviceReminders } from "../services/reminders.ts";

interface Settings {
  distance: number | "all";
  setDistance: (value: number | "all") => void;
}
export interface UI extends Settings {
  data: ViewData;
  mode: Services["mode"];
  routeStatus: ReactNode;
  run: Services["run"];
  read: Services["read"];
  dialog: (contents: ReactNode) => void;
  close: () => void;
  lockDialog: () => (() => boolean) | undefined;
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
  const [failure, setFailure] = useState<{ key: string; message: string }>();
  const [modal, setModal] = useState<ReactNode>(null);
  const [notices, setNotices] = useState<
    { id: string; text: string; undo?: () => Promise<unknown> }[]
  >([]);
  const priorFocus = useRef<HTMLElement | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const dialogLock = useRef<symbol | null>(null);
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
          setFailure(undefined);
          if (data.session)
            showDeviceReminders(`${services.mode}.${data.session.user.id}`, data.notifs);
        }
      })
      .catch((cause) => {
        if (active)
          setFailure({
            key,
            message: cause instanceof Error ? cause.message : "FreshSave could not load this page.",
          });
      });
    return () => {
      active = false;
    };
  }, [services, key, distance, revision, location.pathname, location.search]);

  function close() {
    if (dialogLock.current) return;
    setModal(null);
    const focus = priorFocus.current;
    if (focus?.isConnected) {
      const closedMenu = focus.closest("details:not([open])");
      (closedMenu?.querySelector<HTMLElement>("summary") ?? focus).focus();
    }
    priorFocus.current = null;
  }
  function lockDialog() {
    if (dialogLock.current) return;
    const token = Symbol();
    dialogLock.current = token;
    return () => {
      if (dialogLock.current !== token) return false;
      dialogLock.current = null;
      return true;
    };
  }
  useLayoutEffect(() => {
    setModal(null);
    dialogLock.current = null;
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
    const onKey = (event: KeyboardEvent) => {
      if (
        event.key === "Escape" &&
        !event.defaultPrevented &&
        !document.querySelector("dialog:modal")
      ) {
        event.preventDefault();
        close();
      }
      if (event.key !== "Tab") return;
      const fields = focusable(),
        first = fields[0],
        last = fields[fields.length - 1];
      const focusInside = target.contains(document.activeElement);
      if (
        event.shiftKey &&
        (!focusInside || document.activeElement === first || document.activeElement === target) &&
        last
      ) {
        event.preventDefault();
        last.focus();
      }
      if (!event.shiftKey && (!focusInside || document.activeElement === last) && first) {
        event.preventDefault();
        first.focus();
      }
      if (!first) event.preventDefault();
    };
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

  const error = failure?.key === key ? failure.message : undefined;
  const routeStatus = error ? (
    <div className="empty" role="alert">
      <h1>Could not load FreshSave</h1>
      <p>{error}</p>
      <button
        className="btn"
        onClick={() => {
          setFailure(undefined);
          refresh();
        }}
      >
        Retry
      </button>
    </div>
  ) : view?.key.split("?")[0] !== location.pathname ? (
    <div role="status" aria-busy="true">
      <p className="wrap py-8">Loading FreshSave…</p>
    </div>
  ) : null;
  if (
    !view ||
    (routeStatus &&
      (!view.data.session || /^\/(login|register|forgot|recover)$/.test(location.pathname)))
  )
    return <main>{routeStatus}</main>;
  return (
    <Context.Provider
      value={{
        data: view.data,
        mode: services.mode,
        routeStatus,
        distance,
        setDistance,
        run,
        read: services.read,
        close,
        lockDialog,
        notify,
        dialog: (contents) => {
          if (dialogLock.current) return;
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
