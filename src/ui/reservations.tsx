import { useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { photo } from "../data.js";
import type { Reservation } from "../domain/model.ts";
import { POLICY } from "../domain/time.ts";
import {
  Avatar,
  Badge,
  Button,
  Check,
  Confirm,
  dateWord,
  Disclosure,
  Empty,
  Field,
  formatDate,
  formatDeadline,
  formatTime,
  Heading,
  Note,
  PageNavigation,
  Picture,
  ProductCell,
  rm,
  Tabs,
  units,
} from "./primitives.tsx";
import { useUI } from "./state.tsx";
import { FoodForm } from "./tracking.tsx";

const reasons: Record<string, string> = {
  "no-response": "Seller did not respond in time",
  "not-collected": "Not collected before the deadline",
  "food-expired": "The food date passed before collection",
};
const time = (r: Reservation) =>
  r.status === "confirmed"
    ? r.collectBy
    : r.status === "pending"
      ? r.respondBy
      : r.status === "completed"
        ? r.collectedAt
        : r.decidedAt || r.createdAt;
const open = (r: Reservation) => r.status === "pending" || r.status === "confirmed";
const status = (r: Reservation) => {
  switch (r.status) {
    case "pending":
      return "Awaiting seller";
    case "confirmed":
      return "Ready for pickup";
    case "completed":
      return r.disputed
        ? "Handover disputed"
        : r.handover.method === "simulated"
          ? "Simulated handover recorded"
          : "Handover recorded";
    case "cancelled":
      return "Cancelled by " + (r.by || "user");
    case "declined":
      return "Declined by seller";
    case "expired":
      return "Expired";
  }
};

function PickupCode({ r }: { r: Extract<Reservation, { status: "confirmed" }> }) {
  return (
    <div className="codebar">
      <div>
        <div className="mute sm">Your pickup code – show it to the seller</div>
        <div className="code">{r.pin || "—"}</div>
      </div>
      <p className="mute sm">
        Show the code to the seller at pickup. Reference <b>{r.ref}</b>
      </p>
    </div>
  );
}

function Handover({ r }: { r: Reservation }) {
  const { close, run, notify, mode } = useUI();
  const [code, setCode] = useState(""),
    [item, setItem] = useState(false),
    [paid, setPaid] = useState(false),
    [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <>
      <h3 id="m-title">Complete handover</h3>
      <form
        id="f-handover"
        noValidate
        onSubmit={async (event) => {
          event.preventDefault();
          if (busy) return;
          if (!item || !paid) {
            setError("Tick both boxes to confirm the handover.");
            return;
          }
          setBusy(true);
          const result = await run("completeHandover", { id: r.id, code, item, paid });
          setBusy(false);
          if (result.ok) {
            close();
            notify("Handover recorded");
          } else if (result.error.code === "expired") {
            close();
            notify(result.error.message);
          } else {
            setError(result.error.message);
            setCode("");
            setItem(false);
            setPaid(false);
          }
        }}
      >
        <p>Ask {r.buyerName} for the 4-digit pickup code shown in their reservation.</p>
        {mode === "demo" && r.sample && r.pin && (
          <Note danger>
            Prototype hint · the sample buyer’s pickup code is <b>{r.pin}</b>.
          </Note>
        )}
        <Field id="ho-code" label="Buyer’s pickup code" error={error}>
          <input
            id="ho-code"
            inputMode="numeric"
            value={code}
            maxLength={4}
            autoComplete="off"
            onChange={(event) => setCode(event.target.value)}
          />
        </Field>
        <Check id="ho-item" checked={item} onChange={(event) => setItem(event.target.checked)}>
          I handed over {r.qty} × {r.terms.name}, sealed, with the printed date unchanged
        </Check>
        <Check id="ho-pay" checked={paid} onChange={(event) => setPaid(event.target.checked)}>
          I received {rm(r.terms.price * r.qty)} in person
        </Check>
        <p className="mute sm">A matching pickup code records a handover in FreshSave.</p>
        <div className="macts">
          <Button className="btn sec" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" className="btn sage" disabled={busy}>
            Record handover
          </Button>
        </div>
      </form>
    </>
  );
}

function Cancellation({ r, seller }: { r: Reservation; seller: boolean }) {
  const { run } = useUI(),
    [reason, setReason] = useState("Stock is no longer available");
  return (
    <Confirm
      title={seller ? "Cancel this confirmed pickup?" : "Cancel this reservation?"}
      action="Cancel reservation"
      danger
      submit={() => run("cancelReservation", { id: r.id, reason: seller ? reason : undefined })}
    >
      <p>{units(r.qty)} will be released back to the listing.</p>
      {seller && (
        <Field label="Reason (shown to the buyer)" id="cx-reason">
          <select id="cx-reason" value={reason} onChange={(event) => setReason(event.target.value)}>
            <option>Stock is no longer available</option>
            <option>Item found damaged</option>
            <option>Other</option>
          </select>
        </Field>
      )}
    </Confirm>
  );
}

function ReservationActions({
  r,
  seller,
  detail = false,
}: {
  r: Reservation;
  seller: boolean;
  detail?: boolean;
}) {
  const { dialog, run, data, mode } = useUI(),
    navigate = useNavigate();
  const retailer = data.session?.user.role === "retailer",
    terms = r.terms;
  const link = "/reservation/" + r.id;
  if (!detail && (!seller || !open(r))) {
    return (
      <Link className={"btn sm" + (r.status === "confirmed" ? "" : " sec")} to={link}>
        {r.status === "confirmed"
          ? "Show pickup code"
          : r.status === "completed"
            ? "View record"
            : "View"}
      </Link>
    );
  }
  return (
    <>
      {seller && r.status === "pending" && (
        <>
          <Button
            className="btn sm sec"
            act="rdecline"
            data-id={r.id}
            onClick={() =>
              dialog(
                <Confirm
                  title="Decline this request?"
                  action="Decline"
                  danger
                  submit={() => run("declineReservation", { id: r.id })}
                >
                  <p>{units(r.qty)} return to the listing.</p>
                </Confirm>,
              )
            }
          >
            Decline
          </Button>
          <Button
            className="btn sm sage"
            act="raccept"
            data-id={r.id}
            onClick={() =>
              dialog(
                <Confirm
                  title="Accept this request?"
                  action="Accept"
                  submit={() => run("acceptReservation", { id: r.id })}
                >
                  <p>
                    {r.buyerName} will collect {r.qty} × {terms.name} and pay{" "}
                    {rm(r.qty * terms.price)} in person.
                  </p>
                  <ul className="plainlist">
                    <li>Set the units aside in the Clearance Basket.</li>
                    <li>At pickup, ask the buyer for their 4-digit pickup code.</li>
                  </ul>
                </Confirm>,
              )
            }
          >
            Accept
          </Button>
        </>
      )}
      {seller && r.status === "confirmed" && (
        <>
          {detail && (
            <Button
              className="btn sec"
              act="rcancelseller"
              data-id={r.id}
              onClick={() => dialog(<Cancellation r={r} seller />)}
            >
              Cancel pickup
            </Button>
          )}
          <Button
            className="btn sm sage"
            act="rhandover"
            data-id={r.id}
            onClick={() => dialog(<Handover r={r} />)}
          >
            Complete handover
          </Button>
        </>
      )}
      {!seller && detail && (
        <>
          {mode === "demo" && (
            <Button
              className="btn sec"
              act="chat"
              onClick={() => {
                void run("openThread", { sellerId: terms.sellerId, listingId: r.listingId });
                navigate("?chat=" + terms.sellerId);
              }}
            >
              Contact seller (simulated)
            </Button>
          )}
          {open(r) && (
            <Button
              className="btn danger"
              act="rcancel"
              data-id={r.id}
              onClick={() => dialog(<Cancellation r={r} seller={false} />)}
            >
              Cancel reservation
            </Button>
          )}
          {r.status === "confirmed" && mode === "demo" && data.stores[terms.sellerId]?.sample && (
            <Button
              className="btn sec"
              act="rsimulate"
              data-id={r.id}
              onClick={() =>
                dialog(
                  <Confirm
                    title="Simulate the seller’s handover?"
                    action="Simulate handover"
                    submit={() =>
                      run("completeHandover", {
                        id: r.id,
                        code: "",
                        item: true,
                        paid: true,
                        simulated: true,
                      })
                    }
                  >
                    <p>
                      This sample seller has no account. Simulated handovers are excluded from
                      activity totals.
                    </p>
                  </Confirm>,
                )
              }
            >
              Prototype: simulate seller handover
            </Button>
          )}
          {r.status === "completed" && !r.disputed && (
            <>
              {r.handover.method === "code" && (
                <Button
                  className="btn danger"
                  act="rreport"
                  data-id={r.id}
                  onClick={() =>
                    dialog(
                      <Confirm
                        title="Report a problem with this handover?"
                        action="Report problem"
                        danger
                        submit={() => run("disputeReservation", { id: r.id })}
                      >
                        <p>
                          The handover will be marked as disputed and excluded from activity totals.
                        </p>
                      </Confirm>,
                    )
                  }
                >
                  Report a problem
                </Button>
              )}
              {!retailer && (
                <Button
                  act="addfrom"
                  data-id={r.id}
                  onClick={() =>
                    dialog(<FoodForm popup draft={{ ...terms, qty: r.qty, source: "rescue" }} />)
                  }
                >
                  Add to My food
                </Button>
              )}
            </>
          )}
          {!open(r) && (
            <Link className="btn sec" to="/market">
              Find more food
            </Link>
          )}
        </>
      )}
    </>
  );
}

export function ReservationList() {
  const { data } = useUI(),
    [params] = useSearchParams(),
    user = data.session?.user;
  const retailer = user?.role === "retailer";
  const side = retailer && params.get("view") !== "buyer" ? "seller" : "buyer";
  const seller = side === "seller";
  const rows = data.reservations.filter((r) =>
    seller ? r.terms.sellerId === user?.sellerId : r.buyerId === user?.id,
  );
  const tabs = [
    ["pending", seller ? "Needs response" : "Awaiting seller"],
    ["confirmed", "Ready for pickup"],
    ["completed", "Handed over"],
    ["closed", "Closed"],
  ];
  const inTab = (r: Reservation, key: string) =>
    key === "closed" ? !open(r) && r.status !== "completed" : r.status === key;
  const requested = params.get("tab");
  const tab =
    requested && tabs.some(([key]) => key === requested)
      ? requested
      : ["confirmed", "pending", "completed", "closed"].find((key) =>
          rows.some((r) => inTab(r, key)),
        ) || "pending";
  const displayed = rows
    .filter((r) => inTab(r, tab))
    .sort((a, b) => (open(a) && open(b) ? time(a) - time(b) : time(b) - time(a)));
  const next = !seller
    ? rows.filter((r) => r.status === "confirmed").sort((a, b) => a.collectBy - b.collectBy)[0]
    : undefined;
  return (
    <>
      <Heading
        group="Rescue"
        title={seller ? "Reservations & handovers" : "My reservations"}
        sub={
          seller
            ? "Respond within two hours, then complete handover with the buyer’s pickup code."
            : "Reserved food to collect. Pay the seller in person."
        }
      />
      {retailer && (
        <div className="seg">
          <Link className={seller ? "on" : ""} to="/reservations?view=seller&tab=pending">
            Handling reservations
          </Link>
          <Link className={seller ? "" : "on"} to="/reservations?view=buyer">
            My own orders
          </Link>
        </div>
      )}
      {next && (
        <section className="nextpick">
          <div className="np-h">
            <div>
              <span className="kicker k-rescue">Next pickup</span>
              <h2>{next.terms.name}</h2>
            </div>
          </div>
          <p>
            Collect by <b>{formatDeadline(next.collectBy)}</b> · {next.terms.sellerName},{" "}
            {next.terms.sellerArea}
          </p>
          <PickupCode r={next} />
          <Link className="btn sm" to={"/reservation/" + next.id}>
            Pickup details
          </Link>
        </section>
      )}
      <Tabs
        items={tabs.map(([key, label]) => ({
          label,
          active: tab === key,
          to: `/reservations?view=${side}&tab=${key}`,
          count: rows.filter((r) => inTab(r, key)).length,
        }))}
      />
      {displayed.length ? (
        <div className="tblwrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Product (agreed terms)</th>
                <th>{seller ? "Buyer" : "Seller"}</th>
                <th>Quantity</th>
                <th>When</th>
                <th>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {displayed.map((r) => (
                <tr key={r.id}>
                  <ProductCell
                    item={r.terms}
                    to={"/reservation/" + r.id}
                    detail={
                      <>
                        Ref {r.ref}
                        {r.sample && (
                          <>
                            {" "}
                            · <span className="tagtype sample">Sample record</span>
                          </>
                        )}
                      </>
                    }
                  />
                  <td data-l={seller ? "Buyer" : "Seller"}>
                    {seller ? r.buyerName : r.terms.sellerName}
                  </td>
                  <td data-l="Quantity">
                    {r.qty} × · {rm(r.qty * r.terms.price)}
                  </td>
                  <td data-l="When">
                    <div className="tcell">
                      {r.status === "pending" ? (
                        <b>Respond by {formatDeadline(r.respondBy)}</b>
                      ) : r.status === "confirmed" ? (
                        <b>Collect by {formatDeadline(r.collectBy)}</b>
                      ) : (
                        <>
                          <Badge>{status(r)}</Badge>
                          {r.status === "expired" && <span>{reasons[r.reason || ""]}</span>}
                        </>
                      )}
                    </div>
                  </td>
                  <td className="act-c" data-l="">
                    <div className="acts-cell">
                      <ReservationActions seller={seller} r={r} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty
          title={rows.length ? "Nothing in this view." : "No reservations yet"}
          text={
            !seller && !rows.length
              ? "Find sealed pantry and bakery items near you, then reserve for pickup."
              : undefined
          }
        >
          {!rows.length && (
            <Link className="btn" to={seller ? "/listings" : "/market"}>
              {seller ? "My listings" : "Find food"}
            </Link>
          )}
        </Empty>
      )}
      <PageNavigation />
    </>
  );
}

export function ReservationDetail() {
  const { data, mode } = useUI(),
    { id } = useParams(),
    user = data.session?.user;
  const r = data.reservations.find((record) => record.id === id);
  if (!r)
    return (
      <Empty title="Reservation not found">
        <Link className="btn" to="/reservations">
          Reservations
        </Link>
      </Empty>
    );
  const seller = r.terms.sellerId === user?.sellerId,
    t = r.terms;
  const listing = data.listings.find((record) => record.id === r.listingId),
    store = data.stores[t.sellerId];
  const changed =
    (listing &&
      (listing.price !== t.price ||
        listing.expiry !== t.expiry ||
        listing.instr !== t.instr ||
        listing.pickupUntil !== t.window.until ||
        listing.pickFrom !== t.window.from ||
        listing.pickTo !== t.window.to)) ||
    (store && (store.name !== t.sellerName || store.area !== t.sellerArea));
  const heading = r.status === "pending" ? "Waiting for the seller" : status(r);
  const description =
    r.status === "pending"
      ? "Respond by " + formatDeadline(r.respondBy)
      : r.status === "confirmed"
        ? "Collect by " + formatDeadline(r.collectBy) + ". Pay in person at pickup."
        : r.status === "completed"
          ? r.disputed
            ? "The buyer reported a problem."
            : r.handover.method === "simulated"
              ? "This sample handover is excluded from activity totals."
              : "Recorded after checking the pickup code. This is a record, not independent proof that food changed hands."
          : r.reason
            ? reasons[r.reason] || r.reason
            : "The units were released back to the listing.";
  return (
    <div className="confirm">
      <div className="crumbs">
        <Link to={seller ? "/reservations?view=seller" : "/reservations?view=buyer"}>
          {seller ? "Reservations & handovers" : "My reservations"}
        </Link>{" "}
        › {r.ref} {r.sample && <span className="tagtype sample">Sample record</span>}
      </div>
      <div
        className={
          "okbar" +
          (r.status === "pending"
            ? " wait"
            : r.status === "confirmed" || r.status === "completed"
              ? ""
              : " bad")
        }
      >
        <span className="c" aria-hidden="true">
          ✓
        </span>
        <div>
          <h1>{heading}</h1>
          <div className="mute">{description}</div>
        </div>
      </div>
      {!seller && r.status === "confirmed" && (
        <div className="box codebox">
          <PickupCode r={r} />
        </div>
      )}
      {!seller && r.status === "pending" && (
        <div className="box mute">Your pickup code appears here once the seller accepts.</div>
      )}
      {seller && r.status === "confirmed" && mode === "demo" && r.sample && r.pin && (
        <Note danger>Prototype hint for sample buyer: {r.pin}</Note>
      )}
      {open(r) && (
        <div className="box deadline">
          <div>
            <b>
              {r.status === "pending" ? "Respond by" : "Collect by"} {formatDeadline(time(r))}
            </b>
            <Disclosure title="How this deadline works" className="flat">
              <p className="mute sm">
                {r.status === "pending"
                  ? `Sellers have up to ${POLICY.respondH} hours to respond.`
                  : `The seller holds units for up to ${POLICY.holdH} hours during the agreed collection window.`}
              </p>
            </Disclosure>
          </div>
        </div>
      )}
      <div className="two">
        <div className="box">
          <h3>
            Agreed terms <Badge>Locked at booking</Badge>
          </h3>
          <div className="srow">
            <Picture src={listing?.photos[0] || photo(t.kind)} />
            <div>
              <b>{t.name}</b>
              <div className="mute sm">
                {dateWord(t.expiryType)} {formatDate(t.expiry)}
              </div>
            </div>
          </div>
          <dl className="deflist tight">
            <dt>Quantity</dt>
            <dd>
              {r.qty} × {rm(t.price)}
            </dd>
            <dt>Total</dt>
            <dd>
              <b>{rm(r.qty * t.price)}</b> · pay in person
            </dd>
            <dt>Status</dt>
            <dd>
              <Badge>{status(r)}</Badge>
            </dd>
            {seller && (
              <>
                <dt>Buyer</dt>
                <dd>{r.buyerName}</dd>
              </>
            )}
          </dl>
          {changed && (
            <Note danger>
              The seller has since edited the listing or pickup details. This reservation keeps the
              agreed terms above.
            </Note>
          )}
        </div>
        <div className="box">
          <h3>Pickup</h3>
          <div className="seller">
            <Avatar name={t.sellerName} />
            <b>{t.sellerName}</b>
          </div>
          <dl className="deflist tight">
            <dt>Address</dt>
            <dd>{t.sellerArea}</dd>
            <dt>Collection window</dt>
            <dd>
              By {formatDate(t.window.until)} · {formatTime(t.window.from)}–
              {formatTime(t.window.to)} daily
            </dd>
            <dt>Instructions</dt>
            <dd>{t.instr}</dd>
            <dt>Payment</dt>
            <dd>In person at pickup.</dd>
          </dl>
        </div>
      </div>
      {!seller && (
        <div className="box safety">
          <h3>At pickup, check the food yourself</h3>
          <ul className="tips">
            <li>Check the seal and the printed date against this record.</li>
            <li>Check the label for allergens and decline anything that looks different.</li>
          </ul>
        </div>
      )}
      <details className="box hist">
        <summary>History</summary>
        <ul className="alist">
          {r.events.map((event, index) => (
            <li key={index}>
              <span>
                {event.type}
                {event.by && " by " + event.by}
              </span>
              <small>{formatDeadline(event.at)}</small>
            </li>
          ))}
        </ul>
      </details>
      <div className="row-acts end">
        <ReservationActions seller={seller} r={r} detail />
      </div>
    </div>
  );
}
