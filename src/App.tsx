import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FocusEvent,
  type ReactNode,
} from "react";
import {
  Link,
  Navigate,
  NavLink,
  Outlet,
  createHashRouter,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router";
import { CATEGORIES, RESCUE_CATS } from "./data.js";
import { daysUntil } from "./domain/time.ts";
import type { Services } from "./services/contracts.ts";
import { About, Activity, Dashboard, Notifications, ProfilePage, Recover } from "./ui/account.tsx";
import { Auth, Brand } from "./ui/auth.tsx";
import { Inbox, Item, Market, MarketSearch, Seller } from "./ui/market.tsx";
import { Avatar, Button, Empty, notificationCopy } from "./ui/primitives.tsx";
import { ReservationDetail, ReservationList } from "./ui/reservations.tsx";
import { Basket, BatchDetail, ListingPage, Listings, Stock } from "./ui/retailer.tsx";
import { Provider, useUI } from "./ui/state.tsx";
import { Barcode, Inventory, Scan, ScanResult } from "./ui/tracking.tsx";

function Glyph({ name }: { name: string }) {
  const paths: Record<string, string> = {
    home: "M3 11 12 3l9 8v9H3z M9 20v-6h6v6",
    box: "M4 7 12 3l8 4v11l-8 4-8-4z M4 7l8 4 8-4 M12 11v11 M8 5l8 4",
    store: "M4 10v11h16V10 M3 10l2-6h14l2 6z M9 21v-7h6v7",
    receipt: "M6 3h12v18l-3-2-3 2-3-2-3 2z M9 7h6 M9 11h6 M9 15h4",
    camera: "M3 7h4l2-3h6l2 3h4v13H3z M15.5 13a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z",
    bell: "M18 8a6 6 0 0 0-12 0c0 5-3 7-3 7h18s-3-2-3-7 M10 19a2 2 0 0 0 4 0",
    chat: "M4 4h16v13H9l-5 4z",
    arrow: "m6 9 6 6 6-6",
  };
  return (
    <svg
      className="ico"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name] || paths.box} />
    </svg>
  );
}

function Header() {
  const { data, mode, run } = useUI(),
    location = useLocation(),
    navigate = useNavigate();
  const [params] = useSearchParams();
  const [pop, setPop] = useState<"profile" | "notifications" | null>(null);
  const notificationWrap = useRef<HTMLDivElement>(null);
  const profileWrap = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => setPop(null), [location.pathname]);
  useEffect(() => {
    if (!pop) return;
    const wrapper = (pop === "notifications" ? notificationWrap : profileWrap).current;
    function outside(event: MouseEvent) {
      if (event.target instanceof Node && !wrapper?.contains(event.target)) setPop(null);
    }
    function escape(event: KeyboardEvent) {
      if (
        event.key !== "Escape" ||
        event.defaultPrevented ||
        document.querySelector("#ov.open, dialog:modal")
      )
        return;
      setPop(null);
      wrapper?.querySelector("button")?.focus();
    }
    document.addEventListener("click", outside, true);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("click", outside, true);
      document.removeEventListener("keydown", escape);
    };
  }, [pop]);
  const { user, store } = data.session!;
  const retailer = user.role === "retailer";
  const market = /^\/(market|item|seller)(\/|$)/.test(location.pathname),
    marketHome = location.pathname === "/market";
  const nav = retailer
    ? [
        { to: "/dashboard", label: "Store today", icon: "home", test: /^\/dashboard$/ },
        {
          to: "/batches",
          label: "Stock",
          icon: "box",
          test: /^\/(batch|batches|scan|barcode)(\/|$)/,
          badge: data.batches.filter(
            (b) =>
              b.verify === "unverified" &&
              daysUntil(b.expiry, Date.now()) >= 0 &&
              daysUntil(b.expiry, Date.now()) <= 3,
          ).length,
        },
        {
          to: "/listings",
          label: "Listings",
          icon: "store",
          test: /^\/(listings|sell|basket)(\/|$)/,
          badge: data.listings.filter((l) => l.seller === store.id && l.status === "pending")
            .length,
        },
        {
          to: "/reservations",
          label: "Reservations",
          icon: "receipt",
          test: /^\/reservations?(\/|$)/,
          badge: data.reservations.filter(
            (r) => r.status === "pending" && r.terms.sellerId === store.id,
          ).length,
        },
      ]
    : [
        { to: "/dashboard", label: "Today", icon: "home", test: /^\/dashboard$/ },
        {
          to: "/inventory",
          label: "My food",
          icon: "box",
          test: /^\/(inventory|scan|barcode)(\/|$)/,
          badge: data.inventory.filter(
            (i) => i.status === "active" && daysUntil(i.expiry, Date.now()) <= 1,
          ).length,
        },
        {
          to: "/market",
          label: "Find food",
          icon: "store",
          test: /^\/(market|item|seller)(\/|$)/,
        },
        {
          to: "/reservations",
          label: "Reservations",
          icon: "receipt",
          test: /^\/reservations?(\/|$)/,
          badge: data.reservations.filter((r) => r.status === "confirmed" && r.buyerId === user.id)
            .length,
        },
      ];
  const items = (mobile: boolean) =>
    nav.map((entry) => {
      const active = entry.test.test(location.pathname);
      return (
        <Link
          key={entry.to}
          to={entry.to}
          aria-current={active ? "page" : undefined}
          className={(mobile ? "" : "nav-i ") + (active ? "on" : "")}
        >
          {mobile && <Glyph name={entry.icon} />}
          <span>{entry.label}</span>
          {!!entry.badge && <i>{entry.badge}</i>}
        </Link>
      );
    });
  const unread = data.notifs.filter((n) => n.unread).length,
    name = retailer ? store.name : user.name;
  function link(to: string, label: string) {
    return (
      <Link className="pi" to={to} onClick={() => setPop(null)}>
        {label}
      </Link>
    );
  }
  function closeOnFocusLeave(event: FocusEvent<HTMLDivElement>) {
    if (event.currentTarget.contains(event.relatedTarget)) return;
    const panel = event.currentTarget === notificationWrap.current ? "notifications" : "profile";
    setPop((current) => (current === panel ? null : current));
  }
  function setChat(value: string | null) {
    const next = new URLSearchParams(params);
    if (value === null) next.delete("chat");
    else next.set("chat", value);
    navigate(location.pathname + (next.size ? "?" + next : ""));
  }
  return (
    <>
      <header
        className={location.pathname.startsWith("/item/") ? "hdr hdr-product" : "hdr"}
        id="hdr"
      >
        <div className="hdr-top wrap">
          <Brand to={retailer ? "/dashboard" : "/market"} />
          <nav className="mnav" id="nav" aria-label="Main navigation">
            {items(false)}
          </nav>
          <div className="top-acts">
            <Link
              className="btn sec sell-btn"
              id="cta"
              aria-label={retailer ? "Add stock" : "Add food"}
              to="/scan"
            >
              <Glyph name="camera" />
              <span>{retailer ? "Add stock" : "Add food"}</span>
            </Link>
            {mode === "demo" && (
              <Button
                className="hbtn"
                act="inbox"
                aria-label="Demo messages"
                onClick={(event) => {
                  event.currentTarget.focus();
                  setChat("inbox");
                }}
              >
                <Glyph name="chat" />
              </Button>
            )}
            <div className="hwrap" ref={notificationWrap} onBlur={closeOnFocusLeave}>
              <Button
                className="hbtn"
                act="npop"
                aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
                aria-expanded={pop === "notifications"}
                onClick={() => setPop(pop === "notifications" ? null : "notifications")}
              >
                <Glyph name="bell" />
                {!!unread && (
                  <span className="dot" aria-hidden="true">
                    {unread > 99 ? "99+" : unread}
                  </span>
                )}
              </Button>
              {pop === "notifications" && (
                <div className="pop open" id="npop">
                  <div className="ph">
                    Notifications{" "}
                    <Button className="link sm" onClick={() => run("readNotification", {})}>
                      Mark all read
                    </Button>
                  </div>
                  {data.notifs.slice(0, 6).map((n) => {
                    const { title, detail } = notificationCopy(n);
                    return (
                      <Button
                        key={n.id}
                        className={"pi" + (n.unread ? " unread" : "")}
                        onClick={async () => {
                          if ((await run("readNotification", { id: n.id })).ok) {
                            setPop(null);
                            navigate(n.href.replace(/^#/, ""));
                          }
                        }}
                      >
                        <div>
                          <b>{title}</b>
                          <small>{detail}</small>
                        </div>
                      </Button>
                    );
                  })}
                  {link("/notifications", "View all notifications")}
                </div>
              )}
            </div>
            <div className="hwrap" ref={profileWrap} onBlur={closeOnFocusLeave}>
              <Button
                className="hbtn prof"
                act="mpop"
                aria-label="Account menu"
                aria-expanded={pop === "profile"}
                onClick={() => setPop(pop === "profile" ? null : "profile")}
              >
                <Avatar name={name} />
                <span className="pname">{name}</span>
                <Glyph name="arrow" />
              </Button>
              {pop === "profile" && (
                <div className="pop menu open" id="mpop">
                  <div className="ph col">
                    <b>{name}</b>
                    <small className="mute">{user.email}</small>
                  </div>
                  {link("/profile", "Profile & settings")}
                  {link("/notifications", "Notifications")}
                  {link("/impact", "Your activity")}
                  {retailer && (
                    <>
                      {link("/market", "View marketplace")}
                      {link("/basket", "Clearance Basket")}
                    </>
                  )}
                  {link("/about", "About FreshSave")}
                  <Button
                    className="pi sep"
                    act="logout"
                    onClick={async () => {
                      if ((await run("logout", undefined)).ok) {
                        setPop(null);
                        navigate("/login", { replace: true });
                      }
                    }}
                  >
                    Log out
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
        {market && <MarketSearch />}
        {marketHome && (
          <nav className="catbar" aria-label="Categories">
            <div className="cats wrap" id="cats">
              {CATEGORIES.filter((c) => c.id === "all" || RESCUE_CATS.includes(c.id)).map((c) => (
                <NavLink
                  key={c.id}
                  data-id={c.id}
                  data-act="cat"
                  className={"cat" + ((params.get("cat") || "all") === c.id ? " on" : "")}
                  to={c.id === "all" ? "/market" : "/market?browse=1&cat=" + c.id}
                >
                  {c.label}
                </NavLink>
              ))}
            </div>
          </nav>
        )}
      </header>
      <nav className="bnav" id="bnav" aria-label="Main navigation">
        {items(true)}
      </nav>
      {mode === "demo" && params.has("chat") && (
        <Inbox sellerId={params.get("chat") || "inbox"} close={() => setChat(null)} />
      )}
    </>
  );
}

function Shell() {
  const { data, routeStatus } = useUI(),
    location = useLocation(),
    main = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    main.current?.focus({ preventScroll: true });
  }, [location.pathname]);
  if (!data.session) {
    if (location.pathname === "/about")
      return (
        <div className="auth-plain">
          <header className="wrap">
            <Brand to="/login" />
            <Link className="link" to="/login">
              Back to log in
            </Link>
          </header>
          <div className="wrap">
            <About />
          </div>
        </div>
      );
    return <Navigate to="/login" replace />;
  }
  return (
    <div className="app" id="app">
      <a
        href="#main"
        className="skip"
        onClick={(event) => {
          event.preventDefault();
          main.current?.focus();
          main.current?.scrollIntoView();
        }}
      >
        Skip to main content
      </a>
      <Header key={data.session.user.id} />
      <main id="main" tabIndex={-1} data-page={location.pathname.split("/")[1]} ref={main}>
        {routeStatus || <Outlet />}
      </main>
    </div>
  );
}

function RoleRoute({ children, role }: { children: ReactNode; role: "retailer" | "individual" }) {
  const { data } = useUI();
  return data.session?.user.role === role ? (
    children
  ) : (
    <Navigate to={role === "retailer" ? "/inventory" : "/batches"} replace />
  );
}
function Landing() {
  const { data } = useUI();
  return (
    <Navigate to={data.session?.user.role === "retailer" ? "/dashboard" : "/market"} replace />
  );
}

export const createAppRouter = (services: Services) =>
  createHashRouter([
    {
      element: (
        <Provider services={services}>
          <Outlet />
        </Provider>
      ),
      children: [
        { path: "/login", element: <Auth page="login" /> },
        { path: "/register", element: <Auth page="register" /> },
        { path: "/forgot", element: <Auth page="forgot" /> },
        { path: "/recover", element: <Recover /> },
        {
          element: <Shell />,
          children: [
            { index: true, element: <Landing /> },
            { path: "/market", element: <Market /> },
            { path: "/item/:id", element: <Item /> },
            { path: "/seller/:id", element: <Seller /> },
            { path: "/reservations", element: <ReservationList /> },
            { path: "/reservation/:id", element: <ReservationDetail /> },
            {
              path: "/listings",
              element: (
                <RoleRoute role="retailer">
                  <Listings />
                </RoleRoute>
              ),
            },
            { path: "/sell/:id?", element: <ListingPage /> },
            {
              path: "/basket/:id?",
              element: (
                <RoleRoute role="retailer">
                  <Basket />
                </RoleRoute>
              ),
            },
            {
              path: "/batches",
              element: (
                <RoleRoute role="retailer">
                  <Stock />
                </RoleRoute>
              ),
            },
            {
              path: "/batch/:id",
              element: (
                <RoleRoute role="retailer">
                  <BatchDetail />
                </RoleRoute>
              ),
            },
            {
              path: "/batch/:id/list",
              element: (
                <RoleRoute role="retailer">
                  <ListingPage fromBatch />
                </RoleRoute>
              ),
            },
            {
              path: "/inventory",
              element: (
                <RoleRoute role="individual">
                  <Inventory />
                </RoleRoute>
              ),
            },
            { path: "/scan", element: <Scan /> },
            { path: "/scan/result", element: <ScanResult /> },
            { path: "/barcode", element: <Barcode /> },
            { path: "/dashboard", element: <Dashboard /> },
            { path: "/notifications", element: <Notifications /> },
            { path: "/profile", element: <ProfilePage /> },
            { path: "/impact", element: <Activity /> },
            { path: "/about", element: <About /> },
            {
              path: "*",
              element: (
                <Empty title="Page not found">
                  <Link className="btn" to="/">
                    Go home
                  </Link>
                </Empty>
              ),
            },
          ],
        },
      ],
    },
  ]);
