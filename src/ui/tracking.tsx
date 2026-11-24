import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from "react-router";
import { SCAN_SAMPLES, photo } from "../data.js";
import type { Batch, CatalogueItem, FoodInput, InventoryItem, StockUse } from "../domain/model.ts";
import { daysUntil, shiftDay, storeDay, type DateType } from "../domain/time.ts";
import { gtinOk } from "../domain/barcode.ts";
import {
  Badge,
  Button,
  Categories,
  Check,
  Confirm,
  DateBadge,
  DateTypeFields,
  Disclosure,
  Empty,
  Field,
  formatDate,
  Heading,
  Menu,
  Note,
  PageNavigation,
  Picture,
  ProductCell,
  Tabs,
  useFormErrorFocus,
} from "./primitives.tsx";
import { useUI } from "./state.tsx";

export interface FoodDraft {
  id?: string;
  name?: string;
  cat?: string;
  qty?: number;
  expiry?: string;
  expiryType?: DateType;
  date?: string;
  photo?: string | null;
  kind?: string;
  barcode?: string;
  source?: string;
  detection?: "success" | "uncertain" | "failed" | "barcode";
  suggested?: string;
  illustration?: string;
}
const today = () => storeDay(Date.now());

export async function readPhoto(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Choose an image file.");
  const url = URL.createObjectURL(file);
  try {
    const picture = new Image();
    picture.src = url;
    await picture.decode();
    const scale = Math.min(1, 640 / Math.max(picture.width, picture.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(picture.width * scale));
    canvas.height = Math.max(1, Math.round(picture.height * scale));
    canvas.getContext("2d")?.drawImage(picture, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.78);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function draftFor(record: InventoryItem | Batch): FoodDraft {
  return { ...record, date: "purchased" in record ? record.purchased : record.recorded };
}

export function FoodForm({
  draft = {},
  popup = false,
  afterSave,
}: {
  draft?: FoodDraft;
  popup?: boolean;
  afterSave?: (id: string) => void;
}) {
  const { data, run, close, notify } = useUI(),
    navigate = useNavigate();
  const location = useLocation();
  const prefix = popup ? "man" : "res",
    retailer = data.session?.user.role === "retailer";
  const [values, setValues] = useState({
    name: draft.name || "",
    cat: draft.cat || "",
    qty: String(draft.qty || 1),
    expiry: draft.expiry || "",
    expiryType: draft.expiryType ?? ("" as DateType | ""),
    date: draft.date || today(),
    confirmed: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({}),
    [saving, setSaving] = useState(false);
  const formRef = useFormErrorFocus(Object.values(errors).find(Boolean));
  const [detection, setDetection] = useState(draft.detection),
    [suggested, setSuggested] = useState(draft.suggested);
  const change = <K extends keyof typeof values>(key: K, value: (typeof values)[K]) => {
    setValues((fields) => ({
      ...fields,
      [key]: value,
      ...(["expiry", "expiryType"].includes(key) ? { confirmed: false } : {}),
    }));
    setErrors((fields) => ({ ...fields, [key]: "" }));
  };
  const title = draft.id ? "Edit item" : retailer ? "Record a batch by hand" : "Add food by hand";
  const input = (
    key: "name" | "qty" | "expiry" | "date",
    label: string,
    type = "text",
    hint?: string,
  ) => (
    <Field id={prefix + "-" + key} label={label} error={errors[key]} hint={hint}>
      <input
        id={prefix + "-" + key}
        type={type}
        value={values[key]}
        min={key === "qty" ? 1 : undefined}
        max={key === "date" ? today() : undefined}
        onChange={(event) => change(key, event.target.value)}
      />
    </Field>
  );
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    if (!values.expiryType) {
      setErrors(
        values.name.trim().length < 2
          ? { name: "Enter the product name." }
          : !values.cat
            ? { cat: "Choose a category." }
            : { expiryType: "Choose the date type printed on the pack." },
      );
      return;
    }
    setSaving(true);
    const payload: FoodInput & { id?: string; source?: string } = {
      ...values,
      expiryType: values.expiryType,
      id: draft.id,
      source: draft.source,
      qty: Number(values.qty),
      kind: draft.kind,
      photo: draft.photo,
      barcode: draft.barcode,
    };
    const result = await run("saveFood", payload);
    setSaving(false);
    if (!result.ok) {
      setErrors({ [result.error.field || "general"]: result.error.message });
      return;
    }
    if (popup) close();
    notify(draft.id ? "Changes saved" : retailer ? "Batch recorded" : "Food saved");
    if (afterSave) afterSave(result.value);
    else if (!popup)
      navigate(retailer ? "/batch/" + result.value : "/inventory?new=" + result.value);
    else if (/^\/(scan|reservation)\b/.test(location.pathname))
      navigate(retailer ? "/batches" : "/inventory?new=" + result.value);
  }
  const form = (
    <form
      ref={formRef}
      className={popup ? "task-form" : "form task-form"}
      id={"f-" + prefix}
      noValidate
      onSubmit={submit}
    >
      {!popup && <h2>{retailer ? "Batch details" : "Food details"}</h2>}
      {input("name", "Product name")}
      <div className="cols">
        <Field id={prefix + "-cat"} label="Category" error={errors.cat}>
          <select
            id={prefix + "-cat"}
            value={values.cat}
            onChange={(event) => change("cat", event.target.value)}
          >
            <Categories />
          </select>
        </Field>
        {input("qty", retailer ? "Quantity received" : "Quantity", "number")}
      </div>
      <div className="confirm-date">
        <div className="cd-head">
          <b>Confirm the date on the pack</b>
        </div>
        <DateTypeFields
          prefix={prefix}
          value={values.expiryType}
          error={errors.expiryType}
          onChange={(value) => change("expiryType", value)}
        />
        {input(
          "expiry",
          "Date on the pack",
          "date",
          suggested
            ? "Suggested: " + formatDate(suggested)
            : "Enter the date printed on the package.",
        )}
        {suggested && suggested !== values.expiry && (
          <Button act="usesuggest" className="link sm" onClick={() => change("expiry", suggested)}>
            Use this date
          </Button>
        )}
        <p
          className="note warn"
          id={prefix + "-past"}
          hidden={!values.expiry || daysUntil(values.expiry, Date.now()) >= 0}
        >
          <span>This date has already passed.</span>
        </p>
        <Check
          binding={prefix + ".ok"}
          aria-invalid={!!errors.ok || undefined}
          aria-describedby={errors.ok ? prefix + "-confirmation-error" : undefined}
          checked={values.confirmed}
          onChange={(event) => change("confirmed", event.target.checked)}
        >
          I have checked this date and its type against the pack
        </Check>
        {errors.ok && (
          <p id={prefix + "-confirmation-error"} role="alert" className="hot">
            {errors.ok}
          </p>
        )}
      </div>
      <Disclosure
        title={"More details · " + (retailer ? "date recorded" : "purchase date")}
        className="flat"
        forceOpen={!!errors.date}
      >
        {input("date", retailer ? "Date recorded" : "Purchase date", "date")}
      </Disclosure>
      {errors.general && (
        <p role="alert" className="hot" tabIndex={-1} data-form-error>
          {errors.general}
        </p>
      )}
      <div className={popup ? "macts food-form-actions" : "wnav"}>
        {popup ? (
          <Button className="btn sec" act="mclose" onClick={close}>
            Cancel
          </Button>
        ) : (
          <Link className="btn sec" to="/scan">
            Start over
          </Link>
        )}
        <Button type="submit" disabled={saving}>
          {draft.id ? "Save changes" : "Confirm & save"}
        </Button>
      </div>
    </form>
  );
  if (popup)
    return (
      <>
        <h3 id="m-title">{title}</h3>
        {draft.source === "rescue" && (
          <Note>Pre-filled from your pickup record. Check the date on the pack you received.</Note>
        )}
        {form}
      </>
    );
  const resultText = {
    success: "Simulated reading: a date was found",
    uncertain: "Simulated reading: the date is unclear",
    failed: "Simulated reading: no date found",
    barcode: "Product identified by barcode",
  };
  return (
    <>
      <div className="crumbs">
        <Link to="/scan">Scan food</Link> › Confirm details
      </div>
      <Heading
        title="Confirm before saving"
        sub="Check every detail against the pack."
        group="Track"
      />
      <div className="result">
        <div className="box">
          <div className="res-img">
            <Picture alt="Scanned product" src={draft.photo || draft.illustration} />
          </div>
          <div className="detect">
            <b>{detection && resultText[detection]}</b>
            <small>Confirm the date yourself before saving.</small>
          </div>
          {detection === "barcode" && (
            <Button
              className="btn sec block"
              act="scanlabel"
              onClick={() => {
                const date = shiftDay(today(), 5);
                setSuggested(date);
                change("expiry", date);
                setDetection("success");
              }}
            >
              Simulate scanning the date label
            </Button>
          )}
        </div>
        {form}
      </div>
    </>
  );
}

export function ScanResult() {
  const draft = useLocation().state as FoodDraft | undefined;
  return draft ? <FoodForm draft={draft} /> : <Navigate to="/scan" replace />;
}

export function Scan() {
  const { data, dialog, notify } = useUI(),
    navigate = useNavigate();
  const retailer = data.session?.user.role === "retailer";
  const [stage, setStage] = useState<"idle" | "camera" | "processing">("idle");
  const [scenario, setScenario] = useState("milk"),
    [uploaded, setUploaded] = useState<string | null>(null);
  const captureTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(captureTimer.current), []);
  const sample = SCAN_SAMPLES.find((item) => item.id === scenario)!;
  function capture(image = uploaded) {
    setStage("processing");
    clearTimeout(captureTimer.current);
    captureTimer.current = setTimeout(() => {
      const suggested = sample.exp === null ? "" : shiftDay(today(), sample.exp);
      const draft: FoodDraft = {
        name: sample.name,
        cat: sample.cat,
        kind: sample.kind,
        qty: 1,
        detection: sample.result as FoodDraft["detection"],
        expiryType: sample.et as DateType,
        expiry: sample.result === "success" ? suggested : "",
        suggested,
        photo: image,
        illustration: photo(sample.kind),
      };
      navigate("/scan/result", { state: draft });
    }, 1300);
  }
  const uploader = (
    <label className="btn sec">
      Upload a photo
      <input
        type="file"
        accept="image/*"
        id="scan-file"
        hidden
        onChange={async (event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          try {
            const image = await readPhoto(file);
            setUploaded(image);
            capture(image);
          } catch {
            notify("Could not read that image");
          }
        }}
      />
    </label>
  );
  return (
    <>
      <Heading
        title={retailer ? "Add stock" : "Add food"}
        sub={
          retailer
            ? "Scan the pack or record a batch in your stock."
            : "Scan the pack or enter food by hand."
        }
        group="Track"
        action={
          <>
            <Link className="btn sec" to="/barcode">
              Barcode
            </Link>
            <Button act="addmanual" className="btn sec" onClick={() => dialog(<FoodForm popup />)}>
              Enter by hand
            </Button>
          </>
        }
      />
      <Note danger>
        <b>Simulated scanning.</b> No camera is opened and nothing is read from your photo. Confirm
        the date before saving.
      </Note>
      <div className="scan simple">
        <div className={"cam " + stage}>
          {stage === "idle" ? (
            <div className="cam-off">
              <h3>Photograph the product and its date</h3>
              <div className="acts">
                <Button act="camon" onClick={() => setStage("camera")}>
                  Start simulated scan
                </Button>
                {uploader}
              </div>
            </div>
          ) : (
            <>
              <div className="viewfinder">
                <Picture alt="Camera preview" src={uploaded || photo(sample.kind)} />
                {stage === "processing" && <div className="vf-busy">Reading demo label…</div>}
              </div>
              <div className="cam-ctl">
                <Button
                  act="camoff"
                  className="btn sec"
                  disabled={stage === "processing"}
                  onClick={() => setStage("idle")}
                >
                  Cancel
                </Button>
                <Button
                  act="capture"
                  className="shutter"
                  aria-label="Capture"
                  disabled={stage === "processing"}
                  onClick={() => capture()}
                />
                {uploader}
              </div>
            </>
          )}
        </div>
        <div className="tipsline">
          <span>Show the product name and printed date</span>
          <span>Keep the label in focus</span>
        </div>
        <Disclosure title="Demo option · choose a result" className="demo-opts">
          {SCAN_SAMPLES.map((item) => (
            <label className="rad" key={item.id}>
              <input
                type="radio"
                name="sample"
                value={item.id}
                checked={scenario === item.id}
                onChange={() => setScenario(item.id)}
              />
              {item.label}
            </label>
          ))}
        </Disclosure>
      </div>
    </>
  );
}

export function Barcode() {
  const { run, notify } = useUI(),
    navigate = useNavigate();
  const [code, setCode] = useState(""),
    [outcome, setOutcome] = useState<CatalogueItem | null>(),
    [error, setError] = useState("");
  async function lookup(input: string) {
    const barcode = input.replace(/\D/g, "");
    setCode(barcode);
    setOutcome(undefined);
    setError("");
    if (![8, 12, 13, 14].includes(barcode.length)) {
      notify("Enter 8, 12, 13 or 14 digits");
      return;
    }
    if (!gtinOk(barcode)) {
      notify("That barcode’s check digit doesn’t match.");
      return;
    }
    const result = await run("findBarcode", { barcode });
    if (result.ok) setOutcome(result.value);
    else setError(result.error.message);
  }
  function use(item: CatalogueItem) {
    const draft: FoodDraft = {
      name: item.name,
      cat: item.cat,
      kind: item.kind,
      barcode: code,
      detection: "barcode",
      illustration: photo(item.kind),
    };
    navigate("/scan/result", { state: draft });
  }
  return (
    <>
      <div className="crumbs">
        <Link to="/scan">Scan food</Link> › Barcode lookup
      </div>
      <Heading
        title="Barcode lookup"
        sub="Identify the product, then enter the date printed on its pack."
        group="Track"
      />
      <div className="bc">
        <form
          id="f-bc"
          className="box"
          onSubmit={(event) => {
            event.preventDefault();
            void lookup(code);
          }}
        >
          <div className="bc-scan">
            <span>Barcode camera (simulated)</span>
          </div>
          <Field id="bc-code" label="Barcode number">
            <div className="inline">
              <input
                id="bc-code"
                inputMode="numeric"
                maxLength={14}
                value={code}
                onChange={(event) => setCode(event.target.value)}
              />
              <Button type="submit">Look up</Button>
            </div>
          </Field>
          <div className="pills">
            {[
              ["9556041610018", "Dutch Lady Milk"],
              ["9556001062048", "Milo"],
              ["9556570310120", "Gardenia Bread"],
              ["9551234567896", "Unregistered item"],
            ].map(([value, label]) => (
              <Button
                className="pill"
                act="bcsample"
                data-c={value}
                key={value}
                onClick={() => lookup(value)}
              >
                {label}
              </Button>
            ))}
          </div>
          <Disclosure title="About this catalogue" className="flat">
            <p>Sample products plus your registered items. The barcode check digit is validated.</p>
          </Disclosure>
        </form>
        <div>
          {outcome ? (
            <div className="box bc-res">
              <Badge tone="g">
                {outcome.src === "catalogue" ? "In sample catalogue" : "Registered product"}
              </Badge>
              <h3>{outcome.name}</h3>
              <div className="row-acts">
                <Button act="bcuse" onClick={() => use(outcome)}>
                  Use this product
                </Button>
                <Button act="bcwrong" className="btn sec" onClick={() => setOutcome(null)}>
                  Not this product
                </Button>
              </div>
            </div>
          ) : outcome === null ? (
            <form
              className="box bc-res"
              id="f-bcnew"
              onSubmit={async (event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                const result = await run("saveBarcode", {
                  barcode: code,
                  name: String(form.get("name") || ""),
                  cat: String(form.get("cat") || ""),
                });
                if (result.ok) use(result.value);
                else setError(result.error.message);
              }}
            >
              <Badge tone="y">Not in the catalogue</Badge>
              <Field label="Product name" id="bcnew-name">
                <input id="bcnew-name" name="name" />
              </Field>
              <Field label="Category" id="bcnew-cat">
                <select name="cat" id="bcnew-cat">
                  <Categories />
                </select>
              </Field>
              <Button type="submit">Save product & continue</Button>
            </form>
          ) : (
            <div className="box mute">Enter a barcode number to look it up.</div>
          )}
          {error && (
            <p role="alert" className="hot">
              {error}
            </p>
          )}
        </div>
      </div>
    </>
  );
}

function UseFood({ item, type }: { item: InventoryItem; type: StockUse }) {
  const { run, notify } = useUI(),
    [qty, setQty] = useState(1);
  const word = type === "consumed" ? "used" : "discarded";
  return (
    <Confirm
      title={"How many " + word + "?"}
      action={"Mark " + word}
      submit={async () => {
        const result = await run("useFood", { id: item.id, type, qty });
        if (result.ok)
          notify(`${qty} × ${item.name} marked ${word}`, () => run("undoFood", { id: item.id }));
        return result;
      }}
    >
      <p>
        {item.name} · {item.qty} left
      </p>
      <Field label={"Units " + word} id="use-n">
        <div className="inline">
          <input
            id="use-n"
            type="number"
            min={1}
            max={item.qty}
            value={qty}
            onChange={(event) => setQty(Number(event.target.value))}
          />
          <Button act="useall" className="btn sec" onClick={() => setQty(item.qty)}>
            All {item.qty}
          </Button>
        </div>
      </Field>
    </Confirm>
  );
}

export function Inventory() {
  const { data, run, dialog, notify } = useUI(),
    [params] = useSearchParams();
  const [query, setQuery] = useState(""),
    [category, setCategory] = useState(""),
    [sort, setSort] = useState("exp");
  const active = data.inventory.filter((item) => item.status === "active"),
    now = Date.now();
  const key = params.get("st") || "active",
    soon = ["d1", "d3", "d7"].includes(key);
  const tab = soon ? "d7" : ["history", "expired"].includes(key) ? key : "active";
  const matches = (item: InventoryItem, filter: string) => {
    if (filter === "history") return item.status !== "active";
    if (filter === "active") return item.status === "active";
    const days = daysUntil(item.expiry, now);
    return (
      item.status === "active" &&
      (filter === "expired" ? days < 0 : days >= 0 && days <= Number(filter.slice(1)))
    );
  };
  const rows = data.inventory.filter(
    (item) =>
      matches(item, soon ? key : tab) &&
      (key !== "fresh" || daysUntil(item.expiry, now) > 7) &&
      item.name.toLowerCase().includes(query.toLowerCase()) &&
      (!category || item.cat === category),
  );
  rows.sort((a, b) =>
    tab === "history"
      ? (b.closedAt || 0) - (a.closedAt || 0)
      : sort === "new"
        ? b.addedAt - a.addedAt
        : sort === "name"
          ? a.name.localeCompare(b.name)
          : sort === "qty"
            ? b.qty - a.qty
            : a.expiry.localeCompare(b.expiry),
  );
  async function useFood(item: InventoryItem, type: StockUse) {
    if (item.qty > 1) {
      dialog(<UseFood item={item} type={type} />);
      return;
    }
    const result = await run("useFood", { id: item.id, type, qty: 1 });
    if (result.ok)
      notify(item.name + (type === "consumed" ? " marked used" : " discarded"), () =>
        run("undoFood", { id: item.id }),
      );
    else notify(result.error.message);
  }
  return (
    <>
      <Heading
        title="My food"
        sub={active.length + " items at home"}
        group="Track"
        action={
          <>
            <Link className="btn" to="/scan">
              Scan food
            </Link>
            <Button act="addmanual" className="btn sec" onClick={() => dialog(<FoodForm popup />)}>
              Enter by hand
            </Button>
          </>
        }
      />
      <Tabs
        items={[
          ["active", "All"],
          ["d7", "Use soon"],
          ["expired", "Past date"],
          ["history", "Used & discarded"],
        ].map(([id, label]) => ({
          label,
          active: tab === id,
          count: data.inventory.filter((item) => matches(item, id)).length,
          to: "/inventory?st=" + id,
        }))}
      />
      {soon && (
        <div className="chips">
          <span className="mute">Due within</span>
          {[
            ["d1", "Today & tomorrow"],
            ["d3", "3 days"],
            ["d7", "7 days"],
          ].map(([id, label]) => (
            <Link
              className={"chip" + (id === key ? " on" : "")}
              key={id}
              to={"/inventory?st=" + id}
            >
              {label} <span>{data.inventory.filter((item) => matches(item, id)).length}</span>
            </Link>
          ))}
          <span className="mute sm">Includes everything due sooner, including today.</span>
        </div>
      )}
      {(data.inventory.length > 5 || query || category) && (
        <div className="tbar">
          <div className="tsearch">
            <input
              type="search"
              id="inv-q"
              aria-label="Search your food"
              placeholder="Search your food"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <Disclosure title="Filter & sort" className="flat">
            <div className="inline">
              <select
                className="sel"
                aria-label="Category"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              >
                <Categories />
              </select>
              <select
                className="sel"
                aria-label="Sort"
                value={sort}
                onChange={(event) => setSort(event.target.value)}
              >
                <option value="exp">Date: soonest first</option>
                <option value="new">Recently added</option>
                <option value="name">Name A–Z</option>
                <option value="qty">Quantity</option>
              </select>
            </div>
          </Disclosure>
        </div>
      )}
      {rows.length ? (
        <div className="tblwrap">
          <table className="tbl inv">
            <thead>
              <tr>
                <th>Product</th>
                <th>Left</th>
                <th>Date on pack</th>
                <th>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => (
                <tr className={params.get("new") === item.id ? "hl" : undefined} key={item.id}>
                  <ProductCell item={item} />
                  <td data-l="Left">
                    {item.status === "active" ? (
                      <>
                        <b>{item.qty}</b>
                        {item.initial > item.qty && (
                          <span className="mute sm"> of {item.initial}</span>
                        )}
                      </>
                    ) : (
                      "–"
                    )}
                  </td>
                  <td data-l="Date on pack">
                    {item.status === "active" ? (
                      <DateBadge expiry={item.expiry} type={item.expiryType} />
                    ) : (
                      <Badge>{item.status === "consumed" ? "Used" : "Discarded"}</Badge>
                    )}
                  </td>
                  <td data-l="" className="act-c">
                    <div className="acts-cell tight">
                      {item.status === "active" &&
                      item.expiryType === "use-by" &&
                      daysUntil(item.expiry, Date.now()) < 0 ? (
                        <Button
                          className="ibtn"
                          act="invdone"
                          data-id={item.id}
                          data-s="discarded"
                          onClick={() => useFood(item, "discarded")}
                        >
                          Discard
                        </Button>
                      ) : item.status === "active" ? (
                        <Button
                          className="ibtn go"
                          act="invdone"
                          data-id={item.id}
                          data-s="consumed"
                          onClick={() => useFood(item, "consumed")}
                        >
                          Used
                        </Button>
                      ) : (
                        <Button
                          className="ibtn go"
                          act="invundo"
                          data-id={item.id}
                          onClick={async () => {
                            await run("undoFood", { id: item.id });
                            notify("Restored");
                          }}
                        >
                          Restore
                        </Button>
                      )}
                      <Menu>
                        {item.status === "active" && (
                          <>
                            {item.expiryType === "use-by" &&
                            daysUntil(item.expiry, Date.now()) < 0 ? (
                              <Button
                                act="invdone"
                                data-id={item.id}
                                data-s="consumed"
                                onClick={() => useFood(item, "consumed")}
                              >
                                Mark as used
                              </Button>
                            ) : (
                              <Button
                                act="invdone"
                                data-id={item.id}
                                data-s="discarded"
                                onClick={() => useFood(item, "discarded")}
                              >
                                Discard
                              </Button>
                            )}
                            <Button
                              act="invedit"
                              onClick={() => dialog(<FoodForm popup draft={draftFor(item)} />)}
                            >
                              Edit
                            </Button>
                            {!!item.log.length && (
                              <Button
                                act="invundo"
                                onClick={() => run("undoFood", { id: item.id })}
                              >
                                Undo last change
                              </Button>
                            )}
                          </>
                        )}
                        <Button
                          act="invdel"
                          className="d"
                          onClick={() =>
                            dialog(
                              <Confirm
                                title="Delete this item?"
                                action="Delete"
                                danger
                                submit={() => run("deleteFood", { id: item.id })}
                              >
                                {item.name}
                              </Confirm>,
                            )
                          }
                        >
                          Delete
                        </Button>
                      </Menu>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty
          title={data.inventory.length ? "Nothing here right now." : "Nothing tracked yet"}
          text="Add food and FreshSave shows what to use first."
        >
          <Link className="btn" to="/scan">
            Scan food
          </Link>
        </Empty>
      )}
      <PageNavigation />
      <p className="hintline">
        Reminders appear in FreshSave. <Link to="/profile">Change preferences</Link>
      </p>
    </>
  );
}
