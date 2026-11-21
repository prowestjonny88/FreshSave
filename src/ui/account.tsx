import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { CATEGORIES, ELIGIBILITY, LOCATIONS, photo } from "../data.js";
import { listingLedger, type Preferences } from "../domain/model.ts";
import { handoverMetrics } from "../domain/activity.ts";
import { browse, listingStatus, needsToday } from "../domain/selectors.ts";
import { DAY, daysUntil, STORE_ZONE } from "../domain/time.ts";
import {
  Badge,
  Button,
  Confirm,
  DateBadge,
  Disclosure,
  Empty,
  Field,
  formatDeadline,
  Heading,
  Note,
  PageNavigation,
  Picture,
  rm,
} from "./primitives.tsx";
import { useUI } from "./state.tsx";

export function Dashboard() {
  const { data, run } = useUI(),
    session = data.session!;
  const { user, store } = session,
    retailer = user.role === "retailer";
  const actions = needsToday(data);
  const live = data.listings.filter(
    (l) => l.seller === store.id && listingStatus(l, data.reservations) === "live",
  );
  const held = data.listings
    .filter((l) => l.seller === store.id)
    .reduce((sum, l) => sum + listingLedger(l, data.reservations).held, 0);
  const track = (
    retailer
      ? data.batches.filter((b) => b.verify === "unverified")
      : data.inventory.filter((i) => i.status === "active")
  )
    .filter((item) => daysUntil(item.expiry, Date.now()) <= 7)
    .sort((a, b) => a.expiry.localeCompare(b.expiry))
    .slice(0, 5);
  const nearby = !retailer ? browse(data, "", 5).slice(0, 3) : [];
  const steps = retailer
    ? ([
        ["Record your first batch", "/scan", data.batches.length > 0],
        ["Count the shelf", "/batches", data.batches.some((b) => b.counted !== undefined)],
        ["Offer units on Rescue", "/sell", data.listings.some((l) => l.seller === store.id)],
      ] as const)
    : ([
        ["Add something you bought", "/scan", data.inventory.length > 0],
        ["Choose your area", "/market", !!data.area],
        ["Browse food nearby", "/market", data.reservations.length > 0],
      ] as const);
  const taskLabels: Record<string, string> = {
    "/reservations?view=seller&tab=pending": "Review requests",
    "/reservations?view=seller&tab=confirmed": "View pickups",
    "/listings?tab=ended": "Review ended listings",
    "/basket": "Open Clearance Basket",
    "/batches": "Count stock",
    "/inventory?st=expired": "Review past dates",
    "/inventory?st=d3": "See food to use soon",
    "/reservations?tab=pending": "View pending requests",
  };
  const queue = (items: typeof actions) => (
    <ul className="acts">
      {items.map((item) => (
        <li className={item.tone} key={item.title}>
          <span className="ai" aria-hidden="true" />
          <div>
            <b>{item.title}</b>
            <small>{item.detail}</small>
          </div>
          <Link className="link today-task" to={item.to}>
            {item.to.startsWith("/reservation/")
              ? "View pickup"
              : taskLabels[item.to] || "View details"}
          </Link>
        </li>
      ))}
    </ul>
  );
  const onboarding = user.onboard && (
    <section className="panel onboard">
      <div className="panel-h">
        <h3>Welcome to FreshSave</h3>
        <Button
          className="link sm"
          act="onboardoff"
          onClick={() => run("hideOnboarding", undefined)}
        >
          Hide
        </Button>
      </div>
      <p className="mute">
        Track expiry dates and rescue sealed surplus. {steps.filter(([, , done]) => done).length}/3
        steps done.
      </p>
      <ol className="ob">
        {steps.map(([label, to, done]) => (
          <li className={done ? "done" : ""} key={label}>
            <span className="obn">{done ? "✓" : ""}</span>
            <b>{label}</b>
            {!done && (
              <Link className="btn sm sec" to={to}>
                Open
              </Link>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
  return (
    <>
      <div className="dash-hello slim">
        <div>
          <span className="kicker">{retailer ? "Store today" : "Today"}</span>
          <h1>Hello, {retailer ? store.name : user.name.split(" ")[0]}</h1>
          <p className="mute">
            {new Date().toLocaleDateString("en-MY", {
              timeZone: STORE_ZONE,
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>
        </div>
      </div>
      {!actions.length && onboarding}
      <section className="panel today-queue">
        <div className="panel-h">
          <h3>{retailer ? "Needs your action" : "Needs you today"}</h3>
        </div>
        {actions.length ? (
          <>
            {queue(actions.slice(0, 3))}
            {actions.length > 3 && (
              <details className="acts-more">
                <summary>Show {actions.length - 3} more</summary>
                {queue(actions.slice(3))}
              </details>
            )}
          </>
        ) : (
          <div className="allclear">
            <div>
              <b>You’re all caught up.</b>
            </div>
          </div>
        )}
      </section>
      {!!actions.length && onboarding}
      {retailer && (
        <p className="snapline">
          <Link to="/listings">
            <b>{live.length}</b> live listings ·{" "}
            {live.reduce((sum, l) => sum + listingLedger(l, data.reservations).avail, 0)} units
            available
          </Link>
          <Link to="/reservations?view=seller&tab=confirmed">
            <b>{held}</b> units held for pickup
          </Link>
        </p>
      )}
      {!!track.length && (
        <section className="panel today-secondary">
          <div className="panel-h">
            <h3>{retailer ? "Batches dated within 7 days" : "Use soon"}</h3>
            <Link className="link sm" to={retailer ? "/batches" : "/inventory?st=d7"}>
              View all
            </Link>
          </div>
          <ul className="plist">
            {track.map((item) => (
              <li key={item.id}>
                <Link to={retailer ? "/batch/" + item.id : "/inventory"}>
                  <Picture src={item.photo || photo(item.kind, 0, 200)} />
                  <span>
                    <b>{item.name}</b>
                    <small>{item.qty} units</small>
                  </span>
                  <DateBadge expiry={item.expiry} type={item.expiryType} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      {!!nearby.length && (
        <section className="panel today-secondary">
          <div className="panel-h">
            <h3>Nearby on Rescue</h3>
            <Link className="link sm" to="/market">
              Browse all
            </Link>
          </div>
          <div className="strip">
            {nearby.map((item) => (
              <Link className="mini" to={"/item/" + item.id} key={item.id}>
                <Picture src={item.photos[0] || photo(item.kind)} />
                <div className="t">
                  {item.name}
                  <div className="p">{rm(item.price)}</div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
      {!!data.activity.length && (
        <div className="fold">
          <Disclosure title="Recent activity">
            <ul className="alist">
              {data.activity.slice(0, 5).map((entry, i) => (
                <li key={i}>
                  <span>{entry.text}</span>
                  <small>{formatDeadline(entry.at)}</small>
                </li>
              ))}
            </ul>
            <Link className="link sm" to="/impact">
              Your activity
            </Link>
          </Disclosure>
        </div>
      )}
    </>
  );
}

export function Notifications() {
  const { data, run } = useUI(),
    navigate = useNavigate();
  const [tab, setTab] = useState("all");
  const all = data.notifs,
    unread = all.filter((n) => n.unread).length;
  const filtered = all.filter(
    (n) =>
      tab === "all" ||
      (tab === "unread" && n.unread) ||
      (tab === "expiry" && ["expired", "expiry"].includes(n.type)) ||
      (tab === "stock" && n.type === "stock") ||
      (tab === "resv" && ["resv", "collect"].includes(n.type)),
  );
  return (
    <>
      <Heading
        title="Notifications"
        sub={unread + " unread"}
        action={
          <Button className="btn sec" act="readall" onClick={() => run("readNotification", {})}>
            Mark all as read
          </Button>
        }
      />
      <p className="hintline">
        <b>In-app only.</b> Date reminders appear here when they’re due. FreshSave sends no push,
        SMS or email reminders.
      </p>
      <div className="tabs">
        {[
          ["all", "All"],
          ["unread", "Unread"],
          ["expiry", "Date reminders"],
          ["stock", "Stock counts"],
          ["resv", "Reservations & handovers"],
        ]
          .filter(([id]) => id !== "stock" || data.session?.user.role === "retailer")
          .map(([id, label]) => (
            <Button
              key={id}
              className={"tab" + (tab === id ? " on" : "")}
              act="ntab"
              data-t={id}
              onClick={() => setTab(id)}
            >
              {label}
            </Button>
          ))}
      </div>
      {filtered.length ? (
        <ul className="nlist">
          {filtered.map((n) => (
            <li key={n.id} className={n.unread ? "unread" : ""}>
              <Button
                className="pi"
                act="notif"
                data-id={n.id}
                onClick={async () => {
                  if ((await run("readNotification", { id: n.id })).ok)
                    navigate(n.href.replace(/^#/, ""));
                }}
              >
                <span className="nt">
                  <b>{n.text}</b>
                  <small>{n.sub}</small>
                </span>
                <span className="nwhen">
                  <small>{formatDeadline(n.at)}</small>
                </span>
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <Empty title="Nothing in this view." />
      )}
      <PageNavigation />
    </>
  );
}

export function Activity() {
  const { data } = useUI(),
    retailer = data.session?.user.role === "retailer";
  const { valid: eligible, simulated, disputed } = handoverMetrics(data.reservations);
  const sum = (type: "consumed" | "discarded") =>
    data.inventory
      .flatMap((item) => item.log)
      .filter((entry) => entry.type === type)
      .reduce((total, entry) => total + entry.n, 0);
  const tracked = retailer ? data.batches : data.inventory;
  const active = retailer
    ? data.batches.filter((b) => b.verify === "unverified")
    : data.inventory.filter((i) => i.status === "active");
  const listings = data.listings.filter((listing) => listing.seller === data.session?.store.id);
  const categories = CATEGORIES.map((category) => ({
    ...category,
    count: tracked.filter((item) => item.cat === category.id).length,
  }))
    .filter((category) => category.count > 0)
    .sort((a, b) => b.count - a.count);
  const now = Date.now();
  const weeks = Array.from({ length: 8 }, (_, index) => {
    const end = now - (7 - index) * 7 * DAY;
    const count = eligible.filter(
      (r) => r.collectedAt > end - 7 * DAY && r.collectedAt <= end,
    ).length;
    const label = new Date(end).toLocaleDateString("en-MY", {
      day: "numeric",
      month: "short",
      timeZone: STORE_ZONE,
    });
    return { end, count, label };
  });
  const most = Math.max(1, ...weeks.map((week) => week.count));
  const values = retailer
    ? [
        ["Batches recorded", tracked.length],
        ["Units offered on Rescue", listings.reduce((total, l) => total + l.total, 0)],
        ["Units handed over", eligible.reduce((total, r) => total + r.qty, 0)],
      ]
    : [
        ["Items tracked", tracked.length],
        ["Units marked used", sum("consumed")],
        ["Units discarded", sum("discarded")],
        ["Pickups recorded", eligible.length],
      ];
  const distribution = [
    ["Past date", -Infinity, -1],
    ["Today – tomorrow", 0, 1],
    ["2 – 3 days", 2, 3],
    ["4 – 7 days", 4, 7],
    ["8+ days", 8, Infinity],
  ] as const;
  return (
    <>
      <Heading
        title="Your activity"
        sub="Counts of records kept in FreshSave. This is not an estimate of food waste avoided."
      />
      <div className="stats five">
        {values.map(([title, value]) => (
          <div className="stat" key={title}>
            <small>{title}</small>
            <b>{value}</b>
          </div>
        ))}
      </div>
      <div className="dash-grid">
        <section className="panel">
          <div className="panel-h">
            <h3>{retailer ? "Batches by date" : "Food by date"}</h3>
          </div>
          <ul className="hbars">
            {distribution.map(([label, min, max]) => {
              const count = active.filter((item) => {
                const days = daysUntil(item.expiry, now);
                return days >= min && days <= max;
              }).length;
              return (
                <li key={label}>
                  <span>{label}</span>
                  <div>
                    <i
                      className="g"
                      style={{ width: (100 * count) / Math.max(active.length, 1) + "%" }}
                    />
                  </div>
                  <b>{count}</b>
                </li>
              );
            })}
          </ul>
        </section>
        <section className="panel">
          <div className="panel-h">
            <h3>Categories</h3>
          </div>
          {categories.length ? (
            <ul className="hbars">
              {categories.map((category) => (
                <li key={category.id}>
                  <span>{category.label}</span>
                  <div>
                    <i
                      className="g2"
                      style={{ width: (100 * category.count) / categories[0].count + "%" }}
                    />
                  </div>
                  <b>{category.count}</b>
                </li>
              ))}
            </ul>
          ) : (
            <div className="pempty">No tracked records yet.</div>
          )}
        </section>
        <section className="panel wide">
          <div className="panel-h">
            <h3>Code-checked handovers per week</h3>
            <small className="mute">Last 8 weeks</small>
          </div>
          {eligible.length ? (
            <div className="cols-chart">
              {weeks.map((week) => (
                <div
                  className="cc"
                  key={week.end}
                  aria-label={`${week.label}: ${week.count} handovers`}
                >
                  <span className="cv">{week.count || ""}</span>
                  <i style={{ height: (100 * week.count) / most + "%" }} />
                  <small>{week.label}</small>
                </div>
              ))}
            </div>
          ) : (
            <div className="pempty">No code-checked handovers recorded yet.</div>
          )}
        </section>
      </div>
      <p className="hintline">
        Sample records, simulated handovers and disputed records are excluded. <b>Not measured:</b>{" "}
        waste avoided, CO₂, money saved or outcomes FreshSave cannot observe.
      </p>
      <Disclosure title="How handovers are counted" className="flat">
        <p>
          {simulated} simulated handover{simulated === 1 ? "" : "s"} and {disputed} disputed record
          {disputed === 1 ? "" : "s"} excluded.
        </p>
      </Disclosure>
    </>
  );
}

const preferenceLabels: [keyof Preferences, string][] = [
  ["d7", "7-day date reminder"],
  ["d3", "3-day date reminder"],
  ["d1", "1-day date reminder"],
  ["expired", "Past-date alert"],
  ["stock", "Shelf-count prompts"],
  ["resv", "Reservations & handovers"],
];

export function ProfilePage() {
  const { data, run, notify, dialog, mode } = useUI(),
    navigate = useNavigate(),
    session = data.session!;
  const { user, store } = session,
    retailer = user.role === "retailer";
  const [error, setError] = useState(""),
    [passError, setPassError] = useState("");
  const [busy, setBusy] = useState(false);
  const field = (id: string, name: string, label: string, value = "", type = "text") => (
    <Field id={id} label={label}>
      <input id={id} name={name} type={type} defaultValue={value} />
    </Field>
  );
  return (
    <>
      <Heading title="Profile & settings" />
      <div className="settings">
        <form
          className="form"
          id="f-pf"
          key={user.id}
          onSubmit={async (event) => {
            event.preventDefault();
            const values = new FormData(event.currentTarget),
              get = (key: string) => String(values.get(key) || "");
            setBusy(true);
            const result = await run("profile", {
              name: get("name"),
              email: get("email"),
              loc: get("loc"),
              store: get("store"),
              address: get("address"),
            });
            setBusy(false);
            if (result.ok) {
              setError("");
              notify("Profile saved");
            } else setError(result.error.message);
          }}
        >
          <h2>Profile</h2>
          <div className="cols">
            {field("pf-name", "name", retailer ? "Contact person" : "Full name", user.name)}
            {field("pf-email", "email", "Email", user.email, "email")}
          </div>
          <p className="hint">Account type · {retailer ? "Retailer" : "Individual"}</p>
          <Field id="pf-loc" label={retailer ? "Store area" : "Preferred area"}>
            <select defaultValue={user.loc} id="pf-loc" name="loc">
              {LOCATIONS.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.name}
                </option>
              ))}
            </select>
          </Field>
          {retailer && (
            <>
              <h2>Store</h2>
              {field("pf-store", "store", "Store name", store.name)}
              {field("pf-address", "address", "Pickup address", store.area)}
            </>
          )}
          {error && (
            <p role="alert" className="hot">
              {error}
            </p>
          )}
          <div className="wnav">
            <span />
            <Button type="submit" disabled={busy}>
              Save changes
            </Button>
          </div>
        </form>
        <div>
          <section className="form">
            <h2>In-app notifications</h2>
            <p className="mute sm">
              No push, SMS or email is sent. These preferences control what appears in FreshSave.
            </p>
            {preferenceLabels
              .filter(([key]) => key !== "stock" || retailer)
              .map(([key, text]) => (
                <label className="toggle" key={key}>
                  <span>
                    <b>{text}</b>
                  </span>
                  <input
                    type="checkbox"
                    data-pref={key}
                    checked={user.prefs[key]}
                    onChange={async (event) => {
                      const result = await run("preferences", { [key]: event.target.checked });
                      if (!result.ok) notify(result.error.message);
                    }}
                  />
                  <i />
                </label>
              ))}
          </section>
          <section className="form mt-4">
            <h2>Account</h2>
            {mode === "demo" && (
              <Note danger>
                Your demo password is stored as plain text in this browser. Use a test password
                only.
              </Note>
            )}
            <Disclosure title="Change password" forceOpen={!!passError} className="flat">
              <form
                id="f-pw"
                onSubmit={async (event) => {
                  event.preventDefault();
                  const form = event.currentTarget,
                    values = new FormData(form);
                  const result = await run("changePassword", {
                    current: String(values.get("cur") || ""),
                    password: String(values.get("npw") || ""),
                  });
                  if (result.ok) {
                    setPassError("");
                    form.reset();
                    notify("Password changed");
                  } else setPassError(result.error.message);
                }}
              >
                {field("pf-cur", "cur", "Current password", "", "password")}
                {field("pf-npw", "npw", "New password", "", "password")}
                {passError && (
                  <p className="hot" role="alert">
                    {passError}
                  </p>
                )}
                <Button className="btn sec" type="submit">
                  Change password
                </Button>
              </form>
            </Disclosure>
            <div className="wnav">
              <span />
              <Button
                className="btn danger"
                act="logout"
                onClick={async () => {
                  if ((await run("logout", undefined)).ok) navigate("/login");
                }}
              >
                Log out
              </Button>
            </div>
            <p className="mute sm">
              <Link className="link" to="/about">
                About FreshSave
              </Link>
              {mode === "demo" && (
                <>
                  {" "}
                  ·{" "}
                  <Button
                    className="link"
                    act="resetdemo"
                    onClick={() =>
                      dialog(
                        <Confirm
                          title="Reset demo data?"
                          action="Reset"
                          danger
                          submit={async () => {
                            const result = await run("resetDemo", undefined);
                            if (result.ok) navigate("/login");
                            return result;
                          }}
                        >
                          This restores the original sample records in this browser and logs you
                          out.
                        </Confirm>,
                      )
                    }
                  >
                    Reset demo data
                  </Button>
                </>
              )}
            </p>
          </section>
        </div>
      </div>
    </>
  );
}

export function Recover() {
  const { run } = useUI(),
    navigate = useNavigate(),
    [error, setError] = useState("");
  return (
    <div className="wrap py-8">
      <Heading title="Choose a new password" />
      <form
        className="form max-w-lg"
        onSubmit={async (event) => {
          event.preventDefault();
          const password = String(new FormData(event.currentTarget).get("password") || "");
          const result = await run("changePassword", { current: "", password });
          if (result.ok) navigate("/dashboard", { replace: true });
          else setError(result.error.message);
        }}
      >
        <Field id="reset-password" label="New password">
          <input id="reset-password" name="password" type="password" autoComplete="new-password" />
        </Field>
        {error && (
          <p role="alert" className="hot">
            {error}
          </p>
        )}
        <Button type="submit">Save password</Button>
      </form>
    </div>
  );
}

export function About() {
  const { mode } = useUI();
  return (
    <div className="about">
      <Heading
        title="About this prototype"
        sub="Track expiry dates and reserve sealed surplus for pickup."
      />
      <section className="box">
        <h2>What is real, local or simulated</h2>
        <table className="tbl plain">
          <thead>
            <tr>
              <th>Area</th>
              <th>Status</th>
              <th>Detail</th>
            </tr>
          </thead>
          <tbody>
            {[
              [
                "Accounts",
                mode === "demo" ? "Local only" : "Local Supabase",
                mode === "demo"
                  ? "Demo accounts and records are stored in this browser."
                  : "Local test accounts share a database and can complete a reservation from separate browsers.",
              ],
              [
                "Food scanning",
                "Simulated",
                "You confirm the date and type against the pack before saving.",
              ],
              [
                "Barcode lookup",
                "Catalogue",
                "A sample catalogue plus products registered through FreshSave.",
              ],
              ["Distances", "Approximate", "Estimated between sample neighbourhoods."],
              ["Reminders", "In-app only", "FreshSave displays reminders and reservation status."],
              [
                "Pickup",
                "Code-checked",
                "The seller records handover using the buyer’s pickup code. Pay in person.",
              ],
              [
                "Activity",
                "Recorded counts",
                "Synthetic, simulated and disputed handovers are excluded.",
              ],
            ].map(([feature, label, text]) => (
              <tr key={feature}>
                <th scope="row">{feature}</th>
                <td>
                  <Badge>{label}</Badge>
                </td>
                <td>{text}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="box">
        <h2>Pilot food rules</h2>
        <p>Only sealed, packaged food stored at room temperature can be offered on Rescue.</p>
        <div className="two">
          <div>
            <h3>Accepted</h3>
            <ul className="tips">
              {ELIGIBILITY.filter((item) => item.ok).map((item) => (
                <li key={item.id}>{item.label}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3>Not accepted</h3>
            <ul className="tips">
              {ELIGIBILITY.filter((item) => !item.ok).map((item) => (
                <li key={item.id}>{item.label}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>
      <section className="box">
        <h2>How a reservation works</h2>
        <ol className="plainlist">
          <li>Request the units. The agreed details are recorded.</li>
          <li>The seller responds within two hours.</li>
          <li>Collect during shop hours within the agreed deadline.</li>
          <li>Show the pickup code and pay in person.</li>
        </ol>
      </section>
    </div>
  );
}
