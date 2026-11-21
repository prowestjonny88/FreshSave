import { useState, type FormEvent } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { CAT_KIND, ELIGIBILITY, photo } from "../data.js";
import {
  batchStock as countBatchStock,
  listingLedger,
  type Batch,
  type Listing,
  type ListingInput,
} from "../domain/model.ts";
import { listingStatus } from "../domain/selectors.ts";
import {
  daysUntil,
  lastCollectionDay,
  pastCollectionDate,
  shiftDay,
  storeDay,
  storeTime,
  POLICY,
  type DateType,
} from "../domain/time.ts";
import type { ViewData } from "../services/contracts.ts";
import {
  Badge,
  Button,
  Card,
  Categories,
  Check,
  Confirm,
  DateBadge,
  DateTypeFields,
  dateWord,
  Disclosure,
  Empty,
  Field,
  formatDate,
  formatDeadline,
  formatTime,
  Heading,
  listingCutoff,
  Menu,
  Note,
  PageNavigation,
  Picture,
  ProductCell,
  rm,
  Tabs,
  UnitBar,
  units,
} from "./primitives.tsx";
import { useUI } from "./state.tsx";
import { draftFor, FoodForm, readPhoto } from "./tracking.tsx";

const activeStatuses = ["awaiting", "live", "reserved", "ended"];
const statusLabel: Record<string, string> = {
  awaiting: "Awaiting transfer",
  live: "Live",
  reserved: "Fully reserved",
  ended: "Collection window ended",
  completed: "Completed",
  closed: "Closed",
  removed: "Removed",
};
const defaultInstructions =
  "Ask at the cashier for the FreshSave Clearance Basket and show your pickup code. Pay at the counter.";
const today = () => storeDay(Date.now());

const batchStock = (data: ViewData, batch: Batch, excluding?: string) =>
  countBatchStock(batch, data.listings, data.reservations, excluding);
const batchGroup = (data: ViewData, batch: Batch) =>
  batch.verify === "unverified"
    ? "check"
    : batch.verify === "listed" &&
        data.listings.some(
          (l) =>
            l.batchId === batch.id && activeStatuses.includes(listingStatus(l, data.reservations)),
        )
      ? "listed"
      : "closed";

export function Stock() {
  const { data, dialog } = useUI();
  const [tab, setTab] = useState("check"),
    [query, setQuery] = useState("");
  const rows = data.batches
    .filter(
      (b) => batchGroup(data, b) === tab && b.name.toLowerCase().includes(query.toLowerCase()),
    )
    .sort((a, b) => a.expiry.localeCompare(b.expiry));
  return (
    <>
      <Heading
        title="Stock"
        sub="Count stock near its printed date, then offer surplus on Rescue."
        group="Track"
        action={
          <>
            <Link className="btn" to="/scan">
              Scan batch
            </Link>
            <Button className="btn sec" act="addmanual" onClick={() => dialog(<FoodForm popup />)}>
              Enter by hand
            </Button>
          </>
        }
      />
      <Tabs
        items={[
          ["check", "To count"],
          ["listed", "On Rescue"],
          ["closed", "Finished"],
        ].map(([id, label]) => ({
          id,
          label,
          active: tab === id,
          click: () => setTab(id),
          count: data.batches.filter((b) => batchGroup(data, b) === id).length,
        }))}
      />
      {data.batches.length > 8 && (
        <div className="tbar">
          <div className="tsearch">
            <input
              id="bt-q"
              type="search"
              aria-label="Search batches"
              placeholder="Search batches"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </div>
      )}
      {rows.length ? (
        <div className="tblwrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Product</th>
                <th>Date on pack</th>
                <th>Received</th>
                {tab !== "check" && <th>Status</th>}
                <th>
                  <span className="sr-only">Action</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => (
                <tr key={b.id}>
                  <ProductCell item={b} to={"/batch/" + b.id} />
                  <td data-l="Date on pack">
                    <DateBadge expiry={b.expiry} type={b.expiryType} />
                  </td>
                  <td data-l="Received">{b.qty}</td>
                  {tab !== "check" && (
                    <td data-l="Status">
                      <Badge>
                        {tab === "listed"
                          ? "On Rescue"
                          : b.verify === "dismissed"
                            ? "Sold out – dismissed"
                            : "Finished"}
                      </Badge>
                    </td>
                  )}
                  <td className="act-c" data-l="">
                    <Link
                      className={"btn sm" + (tab === "check" ? "" : " sec")}
                      to={"/batch/" + b.id}
                    >
                      {tab === "check" ? "Count shelf" : "View"}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty title={data.batches.length ? "Nothing in this view." : "No batches recorded yet"}>
          <Link className="btn" to="/scan">
            Scan batch
          </Link>
        </Empty>
      )}
      <p className="hintline">
        Count what is physically on the shelf before you offer or dismiss a batch.
      </p>
    </>
  );
}

export function BatchDetail() {
  const { data, dialog, run } = useUI(),
    { id } = useParams(),
    navigate = useNavigate();
  const batch = data.batches.find((b) => b.id === id);
  if (!batch)
    return (
      <Empty title="Batch not found">
        <Link className="btn" to="/batches">
          Back to stock
        </Link>
      </Empty>
    );
  const state = batchGroup(data, batch),
    stock = batchStock(data, batch);
  const expired = pastCollectionDate(batch.expiry, batch.expiryType, Date.now());
  return (
    <>
      <div className="crumbs">
        <Link to="/batches">Stock</Link> › {batch.name}
      </div>
      <div className="batch">
        <div className="box batch-info">
          <Picture src={batch.photo || photo(batch.kind, 0, 480)} />
          <div>
            <h1 className="d-title">{batch.name}</h1>
            <DateBadge expiry={batch.expiry} type={batch.expiryType} />
            <dl className="deflist">
              <dt>Recorded</dt>
              <dd>{formatDate(batch.recorded)}</dd>
              <dt>Received</dt>
              <dd>{units(batch.qty)}</dd>
              {batch.barcode && (
                <>
                  <dt>Barcode</dt>
                  <dd>{batch.barcode}</dd>
                </>
              )}
              {batch.history.map((record, i) => (
                <div key={i}>
                  <dt>Date corrected</dt>
                  <dd>
                    {formatDate(record.from)} → {formatDate(record.to)}
                  </dd>
                </div>
              ))}
            </dl>
            {state === "check" && (
              <Button
                className="link sm"
                act="batchedit"
                data-id={batch.id}
                onClick={() => dialog(<FoodForm popup draft={draftFor(batch)} />)}
              >
                Correct batch details
              </Button>
            )}
          </div>
        </div>
        {state === "check" ? (
          <section className="stockcheck">
            <div className="sc-head">
              <div>
                <h2>Count the shelf</h2>
                <p>
                  You recorded <b>{units(batch.qty)}</b>. Count what is physically on the shelf now.
                </p>
              </div>
            </div>
            <div className="sc-opts">
              <div className="sc-opt">
                <h3>Sold out / dismiss</h3>
                <p>No units are left.</p>
                <Button
                  className="btn sec block"
                  act="dismiss"
                  onClick={() =>
                    dialog(
                      <Confirm
                        title="Mark batch as sold out?"
                        action="Sold out – dismiss batch"
                        danger
                        submit={() => run("dismissBatch", { id: batch.id })}
                      >
                        <p>Confirm there are no units of {batch.name} left on the shelf.</p>
                      </Confirm>,
                    )
                  }
                >
                  Sold out – dismiss
                </Button>
              </div>
              <div className="sc-opt main">
                <h3>Offer on Rescue</h3>
                <p>Offer sealed, room-temperature packaged food.</p>
                {expired || !stock.listable ? (
                  <>
                    <Button disabled>Offer on Rescue</Button>
                    <p className="hint">
                      {expired
                        ? "Past its printed date – can’t be listed."
                        : "No units left to allocate."}
                    </p>
                  </>
                ) : (
                  <Link className="btn block" to={"/batch/" + batch.id + "/list"}>
                    Offer on Rescue
                  </Link>
                )}
              </div>
            </div>
          </section>
        ) : (
          <section className="box">
            <h3>
              {batch.verify === "dismissed"
                ? "Batch dismissed"
                : state === "listed"
                  ? "Offered on Rescue"
                  : "Listing finished"}
            </h3>
            <div className="ledgerbar" role="group" aria-label="Unit accounting for this batch">
              {[
                [batch.qty, "Received"],
                [stock.offered, "On offer"],
                [stock.handed, "Handed over"],
                [stock.removed, "Removed from sale"],
              ].map(([value, label]) => (
                <div key={label}>
                  <b>{value}</b>
                  <small>{label}</small>
                </div>
              ))}
            </div>
            <Disclosure title="Full unit accounting" className="flat">
              <p>
                <b>Counted when listed:</b> {batch.counted ?? "–"}
              </p>
              <p>Every unit is counted once. {stock.listable} units are not on offer.</p>
            </Disclosure>
            {stock.listed.map((l) => (
              <div className="srow" key={l.id}>
                <Picture src={l.photos[0] || photo(l.kind, 0, 200)} />
                <div className="grow">
                  <Link to={"/item/" + l.id}>
                    <b>{l.name}</b>
                  </Link>
                  <UnitBar ledger={listingLedger(l, data.reservations)} />
                </div>
                <Link className="btn sec sm" to={"/basket/" + l.id}>
                  Manage
                </Link>
              </div>
            ))}
            {state === "closed" &&
              batch.verify !== "dismissed" &&
              !expired &&
              stock.listable > 0 && (
                <Button
                  act="recheck"
                  className="btn sec"
                  onClick={async () => {
                    if ((await run("recountBatch", { id: batch.id })).ok)
                      navigate("/batch/" + batch.id + "/list");
                  }}
                >
                  Count again and offer the rest
                </Button>
              )}
          </section>
        )}
      </div>
    </>
  );
}

function ListingAction({ l, action }: { l: Listing; action: "move" | "return" | "withdraw" }) {
  const { dialog, run, data } = useUI();
  const expired = pastCollectionDate(l.expiry, l.expiryType, Date.now());
  const actionLabel =
    action === "move"
      ? "Confirm moved"
      : action === "withdraw"
        ? "Withdraw listing"
        : expired
          ? "Remove from sale"
          : "Return to shelf";
  const command = action === "move" ? "moveListing" : "closeListing";
  const act = action === "move" ? "moved" : action === "withdraw" ? "lremove" : "lreturn";
  return (
    <Button
      className={action === "withdraw" ? "d" : "ibtn go"}
      act={act}
      data-id={l.id}
      onClick={() =>
        dialog(
          <Confirm
            title={action === "move" ? "Confirm units moved?" : actionLabel + "?"}
            action={actionLabel}
            danger={action === "withdraw"}
            submit={() => run(command, { id: l.id, cancelOpen: action === "withdraw" })}
          >
            <p>
              {action === "move"
                ? "Confirm that the sealed units are physically in your Clearance Basket."
                : expired
                  ? "Remove expired units from sale and close this listing."
                  : "Return the remaining units to normal stock and close this listing."}
            </p>
            <p>
              <b>
                {units(listingLedger(l, data.reservations).avail)} · {l.name}
              </b>
            </p>
          </Confirm>,
        )
      }
    >
      {actionLabel}
    </Button>
  );
}

function ListingTable({ listings, basket }: { listings: Listing[]; basket?: boolean }) {
  const { data } = useUI();
  if (!listings.length)
    return (
      <Empty title={basket ? "Your Clearance Basket is empty" : "Nothing in this view."}>
        <Link className="btn sec" to="/batches">
          Open Stock
        </Link>
      </Empty>
    );
  return (
    <div className="tblwrap">
      <table className="tbl">
        <thead>
          <tr>
            <th>Product</th>
            <th>Units</th>
            <th>Status</th>
            <th>
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {listings.map((l) => {
            const state = listingStatus(l, data.reservations),
              ledger = listingLedger(l, data.reservations),
              edit = activeStatuses.includes(state);
            return (
              <tr key={l.id}>
                <ProductCell
                  item={{ ...l, photo: l.photos[0] }}
                  to={(basket ? "/basket/" : "/item/") + l.id}
                  detail={
                    <>
                      {rm(l.price)} <s>{rm(l.orig)}</s>
                    </>
                  }
                />
                <td data-l="Units" className="ucell">
                  <UnitBar ledger={ledger} />
                </td>
                <td data-l="Status">
                  <div className="datecell">
                    <Badge
                      tone={
                        state === "awaiting"
                          ? "y"
                          : state === "ended"
                            ? "o"
                            : state === "live"
                              ? "g"
                              : ""
                      }
                    >
                      {statusLabel[state]}
                    </Badge>
                    <span className="dl">
                      {dateWord(l.expiryType)} {formatDate(l.expiry)} · collect by{" "}
                      {formatDeadline(listingCutoff(l))}
                    </span>
                  </div>
                </td>
                <td data-l="" className="act-c">
                  <div className="acts-cell tight">
                    {state === "awaiting" ? (
                      <ListingAction l={l} action="move" />
                    ) : state === "ended" && !ledger.held ? (
                      <ListingAction l={l} action="return" />
                    ) : basket ? (
                      <Link className="ibtn" to={"/basket/" + l.id}>
                        Details
                      </Link>
                    ) : edit ? (
                      <Link className="ibtn" to={"/sell/" + l.id}>
                        Edit
                      </Link>
                    ) : (
                      <Link className="ibtn" to={"/sell?from=" + l.id}>
                        Relist
                      </Link>
                    )}
                    {!basket && (
                      <Menu>
                        {edit && <Link to={"/sell/" + l.id}>Edit listing</Link>}
                        <Link to="/reservations?view=seller">Reservations</Link>
                        <Link to={"/basket/" + l.id}>Clearance Basket</Link>
                        {edit && state !== "ended" && <ListingAction l={l} action="withdraw" />}
                      </Menu>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function Listings() {
  const { data } = useUI(),
    [params] = useSearchParams();
  const mine = data.listings.filter(
    (l) => l.seller === data.session?.store.id && l.status !== "removed",
  );
  const group = (l: Listing) => {
    const state = listingStatus(l, data.reservations);
    return ["live", "reserved"].includes(state)
      ? "live"
      : ["awaiting", "ended"].includes(state)
        ? state
        : "done";
  };
  const available = ["awaiting", "ended", "live", "done"];
  const requested = params.get("tab");
  const tab =
    requested && available.includes(requested)
      ? requested
      : available.find((value) => value !== "done" && mine.some((l) => group(l) === value)) ||
        "live";
  return (
    <>
      <Heading
        title="Listings"
        group="Rescue"
        sub={data.session?.store.name}
        action={
          <Link className="btn" to="/sell">
            New listing
          </Link>
        }
      />
      <Tabs
        items={[
          ["live", "Live"],
          ["awaiting", "Awaiting transfer"],
          ["ended", "Needs action"],
          ["done", "Completed & closed"],
        ].map(([key, label]) => ({
          label,
          count: mine.filter((l) => group(l) === key).length,
          active: key === tab,
          to: "/listings?tab=" + key,
        }))}
      />
      <ListingTable listings={mine.filter((l) => group(l) === tab)} />
      <PageNavigation />
      <p className="hintline">
        <Link to="/basket">Clearance Basket overview</Link> ·{" "}
        <Link to="/market">View marketplace as a buyer</Link>
      </p>
    </>
  );
}

export function Basket() {
  const { data } = useUI(),
    { id } = useParams(),
    [params] = useSearchParams();
  const mine = data.listings.filter(
    (l) => l.seller === data.session?.store.id && l.status !== "removed",
  );
  if (!id)
    return (
      <>
        <Heading
          title="Clearance Basket"
          sub="The physical shelf where listed units wait apart from regular stock."
          group="Rescue"
        />
        <ListingTable listings={mine} basket />
      </>
    );
  const l = mine.find((l) => l.id === id);
  if (!l)
    return (
      <Empty title="Listing not found">
        <Link className="btn" to="/basket">
          Clearance Basket
        </Link>
      </Empty>
    );
  const state = listingStatus(l, data.reservations),
    ledger = listingLedger(l, data.reservations),
    expired = pastCollectionDate(l.expiry, l.expiryType, Date.now());
  return (
    <div className="confirm">
      <div className="crumbs">
        <Link to="/basket">Clearance Basket</Link> › {l.name}
      </div>
      {params.has("new") && (
        <div className="okbar">
          <div>
            <b>Listing created</b>
            <p>Buyers can see it after you confirm the physical move.</p>
          </div>
        </div>
      )}
      <div className="basket">
        <div className="basket-h">
          <div>
            <h1>
              {state === "awaiting"
                ? "Move these units to your Clearance Basket."
                : state === "ended"
                  ? "The collection window has ended."
                  : "Clearance Basket details"}
            </h1>
            {state === "ended" && (
              <p>
                {expired
                  ? "Remove expired units from sale."
                  : "Return unclaimed units to the shelf."}
              </p>
            )}
          </div>
        </div>
        <div className="basket-b">
          <Picture src={l.photos[0] || photo(l.kind)} />
          <dl>
            <dt>Product</dt>
            <dd>
              <b>{l.name}</b>
            </dd>
            <dt>Units</dt>
            <dd>
              <UnitBar ledger={ledger} />
            </dd>
            <dt>Date on pack</dt>
            <dd>
              {dateWord(l.expiryType)} {formatDate(l.expiry)}
            </dd>
            <dt>Collect</dt>
            <dd>By {formatDeadline(listingCutoff(l))}</dd>
            <dt>Status</dt>
            <dd>
              <Badge>{statusLabel[state]}</Badge>
            </dd>
            {l.batchId && (
              <>
                <dt>From batch</dt>
                <dd>
                  <Link className="link" to={"/batch/" + l.batchId}>
                    {l.name}
                  </Link>
                </dd>
              </>
            )}
          </dl>
          <div className="basket-acts">
            {state === "awaiting" && <ListingAction l={l} action="move" />}
            {state === "ended" && !ledger.held && ledger.avail > 0 && (
              <ListingAction l={l} action="return" />
            )}
            <Link className="btn sec" to={"/item/" + l.id}>
              View listing
            </Link>
            <Link className="btn sec" to="/listings">
              Listings
            </Link>
            <Link className="link sm" to="/reservations?view=seller&tab=confirmed">
              Handovers →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

type Draft = Omit<ListingInput, "orig" | "price" | "qty"> & {
  orig: string;
  price: string;
  qty: string;
  countedExtra: boolean;
};
const pickupDay = (expiry: string, type: DateType) => {
  if (!expiry) return "";
  const soon = shiftDay(today(), 2),
    max = lastCollectionDay(expiry, type);
  return max < soon ? max : soon;
};

export function ListingPage({ fromBatch = false }: { fromBatch?: boolean }) {
  const { data } = useUI(),
    { id } = useParams(),
    [params] = useSearchParams();
  if (data.session?.user.role !== "retailer")
    return (
      <>
        <Heading title="Listing food" group="Rescue" />
        <Empty title="Listing is for participating retailers in this pilot">
          <Link className="btn" to="/inventory">
            My food
          </Link>
        </Empty>
      </>
    );
  const existing =
    !fromBatch && id
      ? data.listings.find(
          (l) =>
            l.id === id &&
            l.seller === data.session?.store.id &&
            activeStatuses.includes(listingStatus(l, data.reservations)),
        )
      : undefined;
  const batch = fromBatch
    ? data.batches.find((b) => b.id === id && b.verify === "unverified")
    : undefined;
  const from =
    !fromBatch && !id
      ? data.listings.find(
          (l) => l.id === params.get("from") && l.seller === data.session?.store.id,
        )
      : undefined;
  if (id && !existing && !batch)
    return (
      <Empty
        title={
          fromBatch ? "Batch not found or already counted" : "Listing not found or already finished"
        }
      >
        <Link className="btn" to={fromBatch ? "/batches" : "/listings"}>
          Go back
        </Link>
      </Empty>
    );
  return (
    <ListingEditor
      key={id || params.get("from") || "new"}
      existing={existing}
      batch={batch}
      from={from}
    />
  );
}

function ListingEditor({
  existing,
  batch,
  from,
}: {
  existing?: Listing;
  batch?: Batch;
  from?: Listing;
}) {
  const { data, run, dialog, notify } = useUI(),
    navigate = useNavigate();
  const store = data.session!.store,
    prefix = batch ? "bl" : "wz";
  const previous =
    existing ||
    from ||
    (batch && data.listings.find((l) => l.name.toLowerCase() === batch.name.toLowerCase()));
  const [step, setStep] = useState(0),
    [error, setError] = useState<{ message: string; field?: string }>();
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<Draft>(() => ({
    name: existing?.name || from?.name || batch?.name || "",
    cat: existing?.cat || from?.cat || batch?.cat || "",
    desc: existing?.desc || from?.desc || "",
    pack: previous?.pack || "",
    c1: !!existing,
    c2: !!existing,
    c3: !!existing,
    orig: previous ? String(previous.orig) : "",
    price: previous ? String(previous.price) : "",
    qty: existing ? String(existing.total) : batch ? "" : "1",
    expiry: existing?.expiry || batch?.expiry || "",
    expiryType: existing?.expiryType || from?.expiryType || batch?.expiryType || "best-before",
    pickupUntil: existing?.pickupUntil || (batch ? pickupDay(batch.expiry, batch.expiryType) : ""),
    pickFrom: previous?.pickFrom || "10:00",
    pickTo: previous?.pickTo || "21:00",
    instr: previous?.instr || store.defaultInstr || defaultInstructions,
    photos: [...(existing?.photos || from?.photos || [])],
    countedExtra: false,
  }));
  const expiry = batch?.expiry || draft.expiry,
    type = batch?.expiryType || draft.expiryType;
  const maxDay = expiry ? lastCollectionDay(expiry, type) : "";
  const ledger = existing ? listingLedger(existing, data.reservations) : undefined;
  const locked = !!ledger?.held;
  const origin = batch || data.batches.find((item) => item.id === existing?.batchId);
  const cap = origin
    ? batchStock(data, origin, existing?.id).listable +
      (ledger ? ledger.handed + ledger.withdrawn : 0)
    : Infinity;
  const minimum = ledger ? ledger.held + ledger.handed + ledger.withdrawn : 1;
  const eligibility = ELIGIBILITY.find((p) => p.id === draft.pack);
  const unitKey = batch ? "remaining" : "qty";
  const todayValue = today();
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setError(undefined);
  };
  function updateDate(date: string, dateType: DateType) {
    setDraft((current) => ({
      ...current,
      expiry: date,
      expiryType: dateType,
      c3: false,
      pickupUntil:
        !date || !current.pickupUntil || current.pickupUntil > lastCollectionDay(date, dateType)
          ? pickupDay(date, dateType)
          : current.pickupUntil,
    }));
    setError(undefined);
  }
  function validate(part: number) {
    const fail = (message: string, field?: string) => {
      setError({ message, field });
      return false;
    };
    if (part === 0 || batch) {
      if (!batch && draft.name.trim().length < 3)
        return fail("Enter a product name (at least 3 characters).", "name");
      if (!batch && !draft.cat) return fail("Choose a category.", "cat");
      if (!batch && draft.desc.trim().length < 10)
        return fail("Add a short description (at least 10 characters).", "desc");
      if (!eligibility?.ok)
        return fail(
          eligibility
            ? `This item can’t be listed in the pilot. ${eligibility.why}`
            : "Select the food type and storage.",
          "pack",
        );
      if (!draft.c1 || !draft.c2) return fail("Seller declarations needed.", "pack");
    }
    if (part === 1 || batch) {
      if (!(+draft.orig > 0)) return fail("Enter the original price.", "orig");
      if (!(+draft.price > 0) || +draft.price >= +draft.orig)
        return fail("Rescue price must be lower than the original price.", "price");
      const quantity = +draft.qty;
      if (!Number.isSafeInteger(quantity) || quantity < 1)
        return fail("Enter a whole number of at least 1.", unitKey);
      if (quantity < minimum)
        return fail(`At least ${minimum} units are already accounted for.`, unitKey);
      if (quantity > cap)
        return fail(`At most ${cap} units can be offered from this batch.`, unitKey);
      if (existing && quantity > existing.total && !draft.countedExtra)
        return fail("Confirm that you counted the extra units.", "extra");
    }
    if (part === 2 || batch) {
      if (!expiry || expiry < todayValue)
        return fail(
          "Choose today or a future date – food past its printed date can't be listed.",
          "expiry",
        );
      if (!draft.c3) return fail("Confirm the printed date and date type.", "c3");
      if (!draft.pickupUntil || draft.pickupUntil < todayValue || draft.pickupUntil > maxDay)
        return fail(
          type === "use-by"
            ? "Use-by food must be collected at least a day before its date."
            : "Select a collection date on or before the date on the pack.",
          "pickupUntil",
        );
      if (!draft.pickFrom || !draft.pickTo || draft.pickTo <= draft.pickFrom)
        return fail("Closing time must be after opening time.", "pickTo");
      if (storeTime(draft.pickupUntil, draft.pickTo) < Date.now() + POLICY.leadMin * 60_000)
        return fail("Collection must end at least 30 minutes from now.", "pickTo");
      if (!draft.instr.trim()) return fail("Add pickup instructions for buyers.", "instr");
      const name = batch?.name || draft.name;
      if (
        data.listings.some(
          (l) =>
            l.id !== existing?.id &&
            l.seller === store.id &&
            l.name.toLowerCase() === name.trim().toLowerCase() &&
            l.expiry === expiry &&
            activeStatuses.includes(listingStatus(l, data.reservations)),
        )
      )
        return fail("You already have a live listing of this product with this date.", "expiry");
    }
    return true;
  }
  const payload = () => ({
    ...draft,
    id: existing?.id,
    batchId: batch?.id,
    qty: +draft.qty,
    orig: +draft.orig,
    price: +draft.price,
    expiry,
    expiryType: type,
  });
  async function publish() {
    const result = await run("offerBatch", payload());
    if (result.ok) {
      notify(
        existing ? "Listing updated – reservations keep their agreed terms" : "Listing created",
      );
      navigate(existing ? "/listings" : "/basket/" + result.value + "?new=1");
    } else setError(result.error);
    return result;
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy || !validate(step)) return;
    if (batch) {
      dialog(
        <Confirm title="Preview and publish" action="Publish listing" submit={publish}>
          <div className="prevgrid">
            <Card listing={preview} seller={store} preview />
            <div className="revlist">
              <p>
                {units(+draft.qty)} of {batch.qty} received
              </p>
              <p>Collect by {formatDate(draft.pickupUntil)}</p>
            </div>
          </div>
          <Note danger>
            The listing goes live after you confirm the units are in your Clearance Basket.
          </Note>
        </Confirm>,
      );
      return;
    }
    if (step < 3) {
      setStep(step + 1);
      setError(undefined);
      window.scrollTo(0, 0);
      return;
    }
    setBusy(true);
    try {
      await publish();
    } finally {
      setBusy(false);
    }
  }
  const input = (
    key: "name" | "orig" | "price" | "qty" | "pickFrom" | "pickTo" | "pickupUntil",
    label: string,
    inputType = "text",
    hint?: string,
  ) => {
    const id = prefix + "-" + (key === "qty" ? unitKey : key);
    return (
      <Field
        id={id}
        label={label}
        hint={hint}
        error={error?.field === (key === "qty" ? unitKey : key) ? error.message : undefined}
      >
        <input
          id={id}
          type={inputType}
          value={draft[key]}
          onChange={(event) => set(key, event.target.value)}
          disabled={key === "name" && locked}
          max={key === "pickupUntil" ? maxDay : undefined}
          min={key === "pickupUntil" ? todayValue : undefined}
        />
      </Field>
    );
  };
  const quickPrices = (
    <div className="pills">
      <span className="mute sm">Quick price:</span>
      {[30, 50, 70].map((value) => (
        <Button
          key={value}
          className="pill"
          act={prefix + "disc"}
          data-p={value}
          onClick={() =>
            +draft.orig > 0
              ? set("price", (Math.round(+draft.orig * (1 - value / 100) * 10) / 10).toFixed(2))
              : notify("Enter the original price first")
          }
        >
          -{value}%
        </Button>
      ))}
    </div>
  );
  const pricing = (
    <>
      <div className="cols">
        {input("orig", "Original price (RM)", "number")}
        {input("price", "Rescue price (RM)", "number")}
      </div>
      {quickPrices}
      <div className="calc">
        <b>Discount</b>
        <b>
          {+draft.orig > +draft.price && +draft.price > 0
            ? `-${Math.round((1 - +draft.price / +draft.orig) * 100)}%`
            : "–"}
        </b>
      </div>
    </>
  );
  const declarations = (
    <>
      <Field
        id={prefix + "-pack"}
        label="Food type and storage"
        error={error?.field === "pack" ? error.message : undefined}
      >
        <select
          id={prefix + "-pack"}
          value={draft.pack}
          disabled={locked}
          onChange={(event) => set("pack", event.target.value)}
        >
          <option value="">Select…</option>
          <optgroup label="Accepted in the pilot">
            {ELIGIBILITY.filter((x) => x.ok).map((x) => (
              <option key={x.id} value={x.id}>
                {x.label}
              </option>
            ))}
          </optgroup>
          <optgroup label="Not accepted in the pilot">
            {ELIGIBILITY.filter((x) => !x.ok).map((x) => (
              <option key={x.id} value={x.id}>
                {x.label}
              </option>
            ))}
          </optgroup>
        </select>
      </Field>
      <fieldset className="decl">
        <legend>Seller declarations</legend>
        <Check
          binding={prefix + ".c1"}
          checked={draft.c1}
          onChange={(event) => set("c1", event.target.checked)}
        >
          The packaging is sealed, unopened and undamaged
        </Check>
        <Check
          binding={prefix + ".c2"}
          checked={draft.c2}
          onChange={(event) => set("c2", event.target.checked)}
        >
          It needs no refrigeration and has been stored as the label says
        </Check>
        {batch && (
          <Check
            binding={prefix + ".c3"}
            checked={draft.c3}
            onChange={(event) => set("c3", event.target.checked)}
          >
            The printed date and date type match the batch record
          </Check>
        )}
      </fieldset>
      {eligibility && !eligibility.ok ? (
        <Note danger>This item can't be listed in the pilot. {eligibility.why}</Note>
      ) : !draft.c1 || !draft.c2 ? (
        <p className="hint">Seller declarations needed.</p>
      ) : (
        <p className="hint">Seller declarations are not verified by FreshSave.</p>
      )}
    </>
  );
  const collection = (
    <>
      <div className="cols">
        {input("pickFrom", "Open from", "time")}
        {input("pickTo", "Collect until", "time")}
      </div>
      <div className="fixed">
        <b>{store.name}</b> · {store.area}
      </div>
      <Field id={prefix + "-instr"} label="Pickup instructions">
        <textarea
          id={prefix + "-instr"}
          value={draft.instr}
          onChange={(event) => set("instr", event.target.value)}
        />
      </Field>
    </>
  );
  const dateField = input(
    "pickupUntil",
    "Last collection day",
    "date",
    type === "use-by"
      ? "Use-by food must be collected at least a day before the date."
      : "On or before the date on the pack.",
  );
  const preview: Listing = {
    ...draft,
    id: "preview",
    seller: store.id,
    kind: batch?.kind || existing?.kind || CAT_KIND[draft.cat as keyof typeof CAT_KIND] || "rice",
    name: batch?.name || draft.name || "Product name",
    orig: +draft.orig,
    price: +draft.price,
    total: +draft.qty,
    expiry: expiry || todayValue,
    expiryType: type,
    withdrawn: 0,
    moved: false,
    status: "pending",
    postedAt: Date.now(),
  };
  return (
    <>
      <div className="crumbs">
        <Link to={batch ? "/batches" : "/listings"}>{batch ? "Stock" : "Listings"}</Link> ›{" "}
        {batch ? batch.name : existing ? "Edit listing" : "Create listing"}
      </div>
      {batch ? (
        <Heading title="Offer counted units on Rescue" sub={batch.name} group="Rescue" />
      ) : (
        <h1 className="sr-only">{existing ? "Edit listing" : "Create listing"}</h1>
      )}
      <div className="wiz">
        {!batch && (
          <div className="wsteps">
            {["Product", "Price and units", "Date and collection", "Review"].map((label, i) => (
              <div key={label} className={i === step ? "cur" : i < step ? "done" : ""}>
                <b>{i + 1}</b>
                <span>{label}</span>
              </div>
            ))}
          </div>
        )}
        <form className="form" id={"f-" + prefix} onSubmit={submit} noValidate>
          {batch ? (
            <>
              <div className="offer-sum">
                <span>
                  <b>
                    {dateWord(type)} {formatDate(expiry)}
                  </b>{" "}
                  · from your batch record. Wrong date?{" "}
                  <Button
                    act="batchedit"
                    className="link sm"
                    data-id={batch.id}
                    onClick={() =>
                      dialog(
                        <FoodForm
                          popup
                          draft={draftFor(batch)}
                          afterSave={() => {
                            setDraft((current) => ({ ...current, c3: false }));
                            setError(undefined);
                          }}
                        />,
                      )
                    }
                  >
                    Correct the batch
                  </Button>{" "}
                  first.
                </span>
              </div>
              <h2>Count the shelf</h2>
              <div className="qtycheck">
                <div>
                  <small>Received</small>
                  <b>{batch.qty}</b>
                </div>
                {input("qty", "Units you counted on the shelf", "number")}
                <div>
                  <small>Units to offer</small>
                  <b>{+draft.qty || "–"}</b>
                </div>
              </div>
              <p className="hint">At most {cap} can be offered.</p>
              <h2>Price</h2>
              {pricing}
              <h2>Food rules</h2>
              {declarations}
              <Disclosure
                title={
                  <>
                    Collection details{" "}
                    <span className="mute">
                      · by {formatDate(draft.pickupUntil)}, {formatTime(draft.pickFrom)}–
                      {formatTime(draft.pickTo)}
                    </span>
                  </>
                }
                forceOpen={
                  !!error && ["pickupUntil", "pickTo", "instr"].includes(error.field || "")
                }
              >
                {dateField}
                {collection}
                <Field id="bl-desc" label="Description (optional)">
                  <textarea
                    id="bl-desc"
                    value={draft.desc}
                    onChange={(event) => set("desc", event.target.value)}
                  />
                </Field>
              </Disclosure>
            </>
          ) : step === 0 ? (
            <>
              <h2>Product information</h2>
              {locked && (
                <Note danger>
                  Buyers currently hold units, so the product details and date are locked.
                </Note>
              )}
              <Field
                id="wz-photos"
                label="Product photos (up to 4)"
                hint="Without a photo, buyers see an illustrative picture."
              >
                <div className="upl">
                  {draft.photos.map((src, i) => (
                    <div className="slot" key={i}>
                      <Picture src={src} alt={"Upload " + (i + 1)} />
                      <Button
                        className="x"
                        aria-label="Remove image"
                        onClick={() =>
                          set(
                            "photos",
                            draft.photos.filter((_, index) => index !== i),
                          )
                        }
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                  {draft.photos.length < 4 && (
                    <input
                      type="file"
                      multiple
                      id="wz-photos"
                      accept="image/*"
                      onChange={async (event) => {
                        const files = [...(event.target.files || [])].slice(
                          0,
                          4 - draft.photos.length,
                        );
                        try {
                          set("photos", [
                            ...draft.photos,
                            ...(await Promise.all(files.map(readPhoto))),
                          ]);
                        } catch {
                          notify("Could not read that photo");
                        }
                      }}
                    />
                  )}
                </div>
              </Field>
              {input("name", "Product name")}
              <Field id="wz-cat" label="Category">
                <select
                  id="wz-cat"
                  value={draft.cat}
                  disabled={locked}
                  onChange={(event) => set("cat", event.target.value)}
                >
                  <Categories rescue />
                </select>
              </Field>
              <Field id="wz-desc" label="Description">
                <textarea
                  id="wz-desc"
                  value={draft.desc}
                  onChange={(event) => set("desc", event.target.value)}
                />
              </Field>
              <h3>Food rules</h3>
              {declarations}
            </>
          ) : step === 1 ? (
            <>
              <h2>Price and units</h2>
              {locked && <Note>Open reservations keep their agreed price.</Note>}
              {pricing}
              {input(
                "qty",
                existing ? "Total units on this listing" : "Units to offer",
                "number",
                existing
                  ? `Minimum ${minimum}, maximum ${cap}.`
                  : "Count the units you can set aside.",
              )}
              {existing && +draft.qty > existing.total && (
                <Check
                  binding="wz.extra"
                  checked={draft.countedExtra}
                  onChange={(event) => set("countedExtra", event.target.checked)}
                >
                  I counted and set aside the extra units
                </Check>
              )}
            </>
          ) : step === 2 ? (
            <>
              <h2>Date and collection</h2>
              <DateTypeFields
                prefix={prefix}
                value={type}
                disabled={locked}
                onChange={(value) => updateDate(expiry, value)}
              />
              <Field id="wz-expiry" label="Date on the pack">
                <input
                  id="wz-expiry"
                  type="date"
                  min={todayValue}
                  value={expiry}
                  disabled={locked}
                  onChange={(event) => updateDate(event.target.value, type)}
                />
              </Field>
              <Check
                binding="wz.c3"
                checked={draft.c3}
                onChange={(event) => set("c3", event.target.checked)}
              >
                The printed date is legible and matches the date and type I entered
              </Check>
              {dateField}
              <Disclosure
                title="Hours, location and instructions"
                forceOpen={!!error && ["pickTo", "instr"].includes(error.field || "")}
              >
                {collection}
              </Disclosure>
            </>
          ) : (
            <>
              <h2>Review and publish</h2>
              <div className="prevgrid">
                <Card listing={preview} seller={store} preview />
                <div className="revlist">
                  <p>
                    {units(+draft.qty)} · {rm(+draft.price)} each
                  </p>
                  <p>
                    {dateWord(type)} {formatDate(expiry)}
                  </p>
                  <p>{draft.instr}</p>
                </div>
              </div>
              {!existing && (
                <Note danger>
                  After publishing, confirm the physical move to your Clearance Basket.
                </Note>
              )}
            </>
          )}
          {error && (
            <p className="formerr" role="alert">
              {error.message}
            </p>
          )}
          <div className="wnav">
            {!batch && step ? (
              <Button
                act="wzback"
                className="btn sec"
                onClick={() => {
                  setStep(step - 1);
                  setError(undefined);
                }}
              >
                Back
              </Button>
            ) : (
              <Link className="btn sec" to={batch ? "/batch/" + batch.id : "/listings"}>
                Cancel
              </Link>
            )}
            <Button type="submit" disabled={busy}>
              {batch
                ? "Preview listing"
                : step < 3
                  ? "Continue"
                  : existing
                    ? "Save changes"
                    : "Publish listing"}
            </Button>
          </div>
        </form>
        <div className="side-prev">
          <h4>Listing preview</h4>
          <Card listing={preview} seller={store} preview />
        </div>
      </div>
    </>
  );
}
