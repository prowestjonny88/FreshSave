import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from "react-router";
import { SCAN_SAMPLES } from "../data.js";
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
import { cameraAvailable, readExpiry } from "../services/vision.ts";
import { Camera } from "./camera.tsx";

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
  reservationId?: string;
  detection?: "success" | "uncertain" | "failed" | "barcode";
  suggested?: string;
  scanSource?: "label";
}
const today = () => storeDay(Date.now());

function PhotoPicker({
  id,
  label,
  disabled,
  busyLabel,
  filename,
  onPick,
}: {
  id: string;
  label: string;
  disabled: boolean;
  busyLabel: string;
  filename: string | null;
  onPick: (file: File) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const busy = filename !== null;
  return (
    <div className="photo-control">
      <Button
        className="btn sec photo-picker"
        aria-disabled={disabled || undefined}
        onClick={() => {
          if (!disabled) input.current?.click();
        }}
      >
        <svg className="ico" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 16V4m-5 5 5-5 5 5M5 15v4a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-4" />
        </svg>
        {busy ? busyLabel : label}
      </Button>
      <input
        ref={input}
        id={id}
        type="file"
        accept="image/*"
        aria-label={label}
        hidden
        disabled={disabled}
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = "";
          if (file && !disabled) onPick(file);
        }}
      />
      <small className="photo-filename" role="status">
        {busy && <span className="sr-only">{busyLabel} </span>}
        {filename}
      </small>
    </div>
  );
}

export async function readPhoto(file: File, maxSize = 640): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Choose an image file.");
  const url = URL.createObjectURL(file);
  try {
    const picture = new Image();
    picture.src = url;
    await picture.decode();
    const scale = Math.min(1, maxSize / Math.max(picture.width, picture.height));
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
  const { data, mode, run, close, lockDialog, notify } = useUI(),
    navigate = useNavigate();
  const location = useLocation();
  const [picture, setPicture] = useState(draft.photo);
  const [photoError, setPhotoError] = useState("");
  const [labelRead, setLabelRead] = useState(draft.scanSource === "label");
  const [readingFilename, setReadingFilename] = useState<string | null>(null);
  const photoBusy = readingFilename !== null;
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
  const rereadLabel = draft.detection === "barcode" || draft.scanSource === "label";
  async function reviewPhoto(file: File) {
    setPhotoError("");
    setReadingFilename(file.name);
    if (rereadLabel) {
      setLabelRead(true);
      setDetection(undefined);
      setSuggested("");
      setPicture(null);
      setValues((fields) => ({ ...fields, expiry: "", expiryType: "", confirmed: false }));
      setErrors((fields) => ({ ...fields, expiry: "", expiryType: "", ok: "" }));
    }
    try {
      const image = await readPhoto(file, rereadLabel ? 1600 : 640);
      setPicture(image);
      if (!rereadLabel) return;
      const result = await readExpiry(image);
      setDetection(result.detection);
      setSuggested(result.date);
      if (result.detection === "success") {
        setValues((fields) =>
          fields.expiry || fields.expiryType
            ? fields
            : { ...fields, expiry: result.date, expiryType: result.type ?? "", confirmed: false },
        );
      }
    } catch {
      setPhotoError(
        rereadLabel
          ? "Could not read the date label. Try another photo or enter the date by hand."
          : "Could not open that image. Try another photo.",
      );
    } finally {
      setReadingFilename(null);
    }
  }
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
    if (saving || photoBusy) return;
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
    const unlock = popup ? lockDialog() : undefined;
    if (popup && !unlock) return;
    setSaving(true);
    const payload: FoodInput & { id?: string; source?: string; reservationId?: string } = {
      ...values,
      expiryType: values.expiryType,
      id: draft.id,
      source: draft.source,
      reservationId: draft.reservationId,
      qty: Number(values.qty),
      kind: draft.kind,
      photo: picture,
      barcode: draft.barcode,
    };
    let currentDialog = true;
    const result = await run("saveFood", payload).finally(() => {
      if (unlock) currentDialog = unlock();
      setSaving(false);
    });
    if (!currentDialog) return;
    if (!result.ok) {
      setErrors({ [result.error.field || "general"]: result.error.message });
      return;
    }
    if (popup) close();
    notify(draft.id ? "Changes saved" : retailer ? "Batch recorded" : "Food saved");
    if (afterSave) afterSave(result.value);
    else if (!popup)
      navigate(retailer ? "/batch/" + result.value : "/inventory?new=" + result.value);
    else if (draft.reservationId) navigate("/inventory?item=" + result.value);
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
          disabled={rereadLabel && photoBusy}
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
          <Button className="btn sec" act="mclose" disabled={saving} onClick={close}>
            Cancel
          </Button>
        ) : (
          <Link className="btn sec" to="/scan">
            Start over
          </Link>
        )}
        <Button type="submit" disabled={saving || photoBusy}>
          {saving ? "Saving…" : draft.id ? "Save changes" : "Confirm & save"}
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
    success: labelRead ? "Date read from photo" : "Simulated reading: a date was found",
    uncertain: labelRead
      ? "Date unclear. Check the pack."
      : "Simulated reading: the date is unclear",
    failed: labelRead
      ? "No complete date found. Enter it from the pack."
      : "Simulated reading: no date found",
    barcode: "Product identified by barcode",
  };
  const labelNeedsRetry =
    Boolean(photoError) || (labelRead && (detection === "failed" || detection === "uncertain"));
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
        <aside className="box scan-review" aria-label="Scan result">
          {detection && (
            <div
              className={
                "scan-message " +
                (detection === "failed" || detection === "uncertain" ? "scan-message-warn" : "")
              }
              role="status"
            >
              <strong>{detection && resultText[detection]}</strong>
            </div>
          )}
          {picture && (
            <div className="res-img">
              <Picture
                alt={rereadLabel ? "Photo of the printed date" : "Attached product photo"}
                src={picture}
              />
            </div>
          )}
          <div className="row-acts scan-actions">
            <PhotoPicker
              id={draft.detection === "barcode" ? "barcode-label" : "scan-file"}
              label={
                labelNeedsRetry
                  ? "Try another photo"
                  : picture
                    ? rereadLabel
                      ? "Replace label photo"
                      : "Replace photo"
                    : rereadLabel
                      ? "Read date from photo"
                      : "Attach a photo"
              }
              disabled={photoBusy || saving}
              busyLabel={rereadLabel ? "Reading label…" : "Opening photo…"}
              filename={readingFilename}
              onPick={reviewPhoto}
            />
            {detection === "barcode" && mode === "demo" && (
              <Button
                className="btn sec"
                act="scanlabel"
                disabled={photoBusy}
                onClick={() => {
                  const date = shiftDay(today(), 5);
                  setSuggested(date);
                  change("expiry", date);
                  setDetection("success");
                }}
              >
                Use a sample date
              </Button>
            )}
          </div>
          {photoError && (
            <p className="formerr" role="alert">
              {photoError}
            </p>
          )}
        </aside>
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
  const { data, dialog } = useUI();
  const navigate = useNavigate();
  const retailer = data.session?.user.role === "retailer";
  const [camera, setCamera] = useState(false);
  const [readingFilename, setReadingFilename] = useState<string | null>(null);
  const reading = readingFilename !== null;
  const [error, setError] = useState("");
  const readVersion = useRef(0);
  useEffect(
    () => () => {
      readVersion.current += 1;
    },
    [],
  );
  function abandonReading() {
    readVersion.current += 1;
    setReadingFilename(null);
    setError("");
  }
  function closeCamera() {
    setCamera(false);
    requestAnimationFrame(() => document.getElementById("date-camera-trigger")?.focus());
  }
  async function readLabel(image: string | File) {
    if (reading) return;
    const version = ++readVersion.current;
    setReadingFilename(typeof image === "string" ? "" : image.name);
    setCamera(false);
    if (typeof image === "string")
      requestAnimationFrame(() =>
        document.querySelector<HTMLButtonElement>(".label-scan .photo-picker")?.focus(),
      );
    setError("");
    try {
      const photo = typeof image === "string" ? image : await readPhoto(image, 1600);
      if (version !== readVersion.current) return;
      const result = await readExpiry(photo);
      if (version !== readVersion.current) return;
      navigate("/scan/result", {
        state: {
          scanSource: "label",
          detection: result.detection,
          expiryType: result.type ?? undefined,
          expiry: result.detection === "success" ? result.date : "",
          suggested: result.date,
          photo,
        } satisfies FoodDraft,
      });
    } catch {
      if (version === readVersion.current)
        setError("Could not read the label photo. Try another photo or enter the date by hand.");
    } finally {
      if (version === readVersion.current) {
        setReadingFilename(null);
      }
    }
  }
  function trySample(sample: (typeof SCAN_SAMPLES)[number]) {
    abandonReading();
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
    };
    navigate("/scan/result", { state: draft });
  }

  return (
    <>
      <Heading
        title={retailer ? "Add stock" : "Add food"}
        group="Track"
        action={
          <>
            <Link className="btn sec" to="/barcode">
              Barcode
            </Link>
            <Button
              act="addmanual"
              className="btn sec"
              onClick={() => {
                abandonReading();
                setCamera(false);
                dialog(<FoodForm popup />);
              }}
            >
              Enter by hand
            </Button>
          </>
        }
      />
      <section className="box label-scan" aria-labelledby="label-scan-title">
        <h2 id="label-scan-title">Read the date on a pack</h2>
        <p>Use a photo that shows the printed date and its label.</p>
        {camera && <Camera kind="photo" onRead={readLabel} close={closeCamera} />}
        <div className="row-acts scan-actions">
          {!camera && cameraAvailable() && (
            <Button
              id="date-camera-trigger"
              className="btn sec"
              onClick={() => {
                abandonReading();
                setCamera(true);
              }}
            >
              Open camera
            </Button>
          )}
          <PhotoPicker
            id="label-photo"
            label={error ? "Try another photo" : "Upload label photo"}
            disabled={reading}
            busyLabel="Reading label…"
            filename={readingFilename}
            onPick={readLabel}
          />
        </div>
        {error && (
          <p className="formerr" role="alert">
            {error}
          </p>
        )}
      </section>
      <section className="box sample-scan" aria-labelledby="sample-scan-title">
        <h2 id="sample-scan-title">Try a sample scan</h2>
        <p>Simulated scanning. Choose a sample, then check its date before saving.</p>
        <div className="row-acts">
          {SCAN_SAMPLES.map((sample) => (
            <Button
              className="btn sec"
              key={sample.id}
              act="scan-sample"
              data-id={sample.id}
              onClick={() => trySample(sample)}
            >
              {
                { success: "Clear date", uncertain: "Blurry date", failed: "Missing date" }[
                  sample.result
                ]
              }
            </Button>
          ))}
        </div>
      </section>
    </>
  );
}

export function Barcode() {
  const { run } = useUI(),
    navigate = useNavigate();
  const [code, setCode] = useState(""),
    [outcome, setOutcome] = useState<CatalogueItem | null>(),
    [error, setError] = useState(""),
    [fieldError, setFieldError] = useState("");
  const barcodeField = useRef<HTMLInputElement>(null);
  const [camera, setCamera] = useState(false);
  const cameraActive = useRef(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [savingProduct, setSavingProduct] = useState(false);
  const latestLookup = useRef(0);
  const lookupResult = useRef<HTMLDivElement>(null);
  const shouldFocusResult = useRef(false);
  useLayoutEffect(() => {
    if (lookingUp || !shouldFocusResult.current) return;
    shouldFocusResult.current = false;
    (
      lookupResult.current?.querySelector<HTMLElement>("#bcnew-name") ??
      lookupResult.current?.querySelector<HTMLElement>("h3, [role=alert]") ??
      barcodeField.current
    )?.focus();
  }, [lookingUp, outcome, error]);
  function stopCamera() {
    cameraActive.current = false;
    setCamera(false);
  }
  async function lookup(input: string, fromCamera = false) {
    if (savingProduct || (fromCamera && !cameraActive.current)) return;
    stopCamera();
    shouldFocusResult.current = fromCamera;
    const request = ++latestLookup.current;
    const barcode = input.replace(/\D/g, "");
    setCode(barcode);
    setOutcome(undefined);
    setError("");
    setFieldError("");
    setLookingUp(false);
    if (![8, 12, 13, 14].includes(barcode.length)) {
      setFieldError("Enter 8, 12, 13 or 14 digits.");
      shouldFocusResult.current = false;
      barcodeField.current?.focus();
      return;
    }
    if (!gtinOk(barcode)) {
      setFieldError("That barcode’s check digit doesn’t match.");
      shouldFocusResult.current = false;
      barcodeField.current?.focus();
      return;
    }
    setLookingUp(true);
    const result = await run("findBarcode", { barcode });
    if (request !== latestLookup.current) return;
    setLookingUp(false);
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
    };
    navigate("/scan/result", { state: draft });
  }
  return (
    <>
      <div className="crumbs">
        <Link to="/scan">Add food or stock</Link> › Barcode lookup
      </div>
      <Heading
        title="Barcode lookup"
        sub="Scan or enter the barcode to find the product. You’ll check the date next."
        group="Track"
      />
      <div
        className={
          "bc barcode-workspace" +
          (outcome !== undefined || error || lookingUp ? " has-result" : "")
        }
      >
        <form
          id="f-bc"
          className="box"
          onSubmit={(event) => {
            event.preventDefault();
            void lookup(code);
          }}
        >
          {camera && (
            <Camera
              kind="barcode"
              close={() => {
                stopCamera();
                requestAnimationFrame(() =>
                  document.getElementById("barcode-camera-trigger")?.focus(),
                );
              }}
              onRead={(value) => void lookup(value, true)}
            />
          )}
          {!camera && cameraAvailable() && (
            <Button
              id="barcode-camera-trigger"
              className="btn sec camera-launch"
              disabled={savingProduct}
              onClick={() => {
                cameraActive.current = true;
                setCamera(true);
              }}
            >
              Scan barcode with camera
            </Button>
          )}
          <Field id="bc-code" label="Barcode number" error={fieldError}>
            <div className="barcode-entry">
              <input
                id="bc-code"
                ref={barcodeField}
                aria-invalid={!!fieldError || undefined}
                aria-describedby={fieldError ? "bc-code-error" : undefined}
                inputMode="numeric"
                maxLength={14}
                value={code}
                disabled={savingProduct}
                onChange={(event) => {
                  latestLookup.current += 1;
                  shouldFocusResult.current = false;
                  setCode(event.target.value);
                  setOutcome(undefined);
                  setError("");
                  setFieldError("");
                  setLookingUp(false);
                }}
              />
              <Button type="submit" disabled={lookingUp || savingProduct}>
                Look up
              </Button>
            </div>
          </Field>
          <div className="barcode-examples">
            <p className="mute sm">Try a sample barcode</p>
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
                  disabled={savingProduct}
                  onClick={() => lookup(value)}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>
          <Disclosure title="About this catalogue" className="flat">
            <p>Sample products plus your registered items. The barcode check digit is validated.</p>
          </Disclosure>
        </form>
        <div
          className="barcode-result"
          ref={lookupResult}
          hidden={outcome === undefined && !error && !lookingUp}
        >
          {lookingUp && (
            <div className="box scan-message" role="status">
              Looking up barcode…
            </div>
          )}
          {outcome ? (
            <div className="box bc-res">
              <Badge tone="g">
                {outcome.src === "catalogue" ? "In sample catalogue" : "Registered product"}
              </Badge>
              <h3 tabIndex={-1}>{outcome.name}</h3>
              <div className="row-acts">
                <Button act="bcuse" onClick={() => use(outcome)}>
                  Use this product
                </Button>
                <Button
                  act="bcwrong"
                  className="btn sec"
                  onClick={() => {
                    shouldFocusResult.current = true;
                    setOutcome(null);
                  }}
                >
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
                if (savingProduct) return;
                const form = new FormData(event.currentTarget);
                setSavingProduct(true);
                setError("");
                const result = await run("saveBarcode", {
                  barcode: code,
                  name: String(form.get("name") || ""),
                  cat: String(form.get("cat") || ""),
                });
                setSavingProduct(false);
                if (result.ok) use(result.value);
                else setError(result.error.message);
              }}
            >
              <Badge tone="y">Not in the catalogue</Badge>
              <h3>Add this product</h3>
              <Field label="Product name" id="bcnew-name">
                <input id="bcnew-name" name="name" disabled={savingProduct} />
              </Field>
              <Field label="Category" id="bcnew-cat">
                <select name="cat" id="bcnew-cat" disabled={savingProduct}>
                  <Categories />
                </select>
              </Field>
              <div className="row-acts">
                <Button type="submit" disabled={savingProduct}>
                  {savingProduct ? "Saving…" : "Save product & continue"}
                </Button>
              </div>
            </form>
          ) : null}
          {error && (
            <p role="alert" className="formerr" tabIndex={-1}>
              {error}
            </p>
          )}
        </div>
      </div>
    </>
  );
}

function UseFood({
  item,
  type,
  onUsed,
}: {
  item: InventoryItem;
  type: StockUse;
  onUsed: (qty: number) => void;
}) {
  const { run } = useUI(),
    [qty, setQty] = useState(1);
  const word = type === "consumed" ? "used" : "discarded";
  return (
    <Confirm
      title={"How many " + word + "?"}
      action={"Mark " + word}
      submit={async () => {
        const result = await run("useFood", { id: item.id, type, qty });
        if (result.ok) onUsed(qty);
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
  const table = useRef<HTMLTableElement>(null);
  const fallback = useRef<HTMLDivElement>(null);
  const [focusRequest, setFocusRequest] = useState<{
    id: string;
    candidates: string[];
    previousStatus?: InventoryItem["status"];
    query: string;
  }>();
  const active = data.inventory.filter((item) => item.status === "active"),
    now = Date.now();
  const selected = params.get("item"),
    selectedFood = data.inventory.find((item) => item.id === selected),
    key = selectedFood
      ? selectedFood.status === "active"
        ? "active"
        : "history"
      : params.get("st") || "active",
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
      (selected ? item.id === selected : matches(item, soon ? key : tab)) &&
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
  useLayoutEffect(() => {
    if (!focusRequest) return;
    const current = data.inventory.find((record) => record.id === focusRequest.id);
    if (
      focusRequest.query === params.toString() &&
      (focusRequest.previousStatus
        ? current?.status === focusRequest.previousStatus
        : current?.status !== "active")
    )
      return;
    const rendered = Array.from(
      table.current?.querySelectorAll<HTMLTableRowElement>("tr[data-food-id]") ?? [],
    );
    const target = focusRequest.candidates
      .map((id) => rendered.find((row) => row.dataset.foodId === id))
      .find(Boolean);
    (
      target?.querySelector<HTMLElement>(".acts-cell > button") ??
      fallback.current?.querySelector<HTMLElement>(".tab.on")
    )?.focus();
    setFocusRequest(undefined);
  }, [data.inventory, focusRequest, params]);

  function focusAfterRemoval(item: InventoryItem) {
    const index = rows.findIndex((row) => row.id === item.id);
    setFocusRequest({
      id: item.id,
      candidates: [
        item.id,
        ...rows.slice(index + 1).map((row) => row.id),
        ...rows
          .slice(0, index)
          .reverse()
          .map((row) => row.id),
      ],
      previousStatus: item.status,
      query: params.toString(),
    });
  }
  function reportUse(item: InventoryItem, type: StockUse, qty: number) {
    if (qty === item.qty) focusAfterRemoval(item);
    const word = type === "consumed" ? "used" : "discarded";
    notify(item.name + " marked " + word, async () => {
      const result = await run("undoFood", { id: item.id });
      if (result.ok)
        setFocusRequest({ id: item.id, candidates: [item.id], query: params.toString() });
      else notify(result.error.message);
    });
  }
  async function useFood(item: InventoryItem, type: StockUse) {
    if (item.qty > 1) {
      dialog(<UseFood item={item} type={type} onUsed={(qty) => reportUse(item, type, qty)} />);
      return;
    }
    const result = await run("useFood", { id: item.id, type, qty: 1 });
    if (result.ok) reportUse(item, type, 1);
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
      {selected && (
        <Link className="link" to="/inventory">
          View all food
        </Link>
      )}
      <div ref={fallback}>
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
      </div>
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
            <label>
              Category
              <select
                className="sel"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              >
                <Categories placeholder="All categories" />
              </select>
            </label>
            <label>
              Sort by
              <select
                className="sel"
                value={sort}
                onChange={(event) => setSort(event.target.value)}
              >
                <option value="exp">Date: soonest first</option>
                <option value="new">Recently added</option>
                <option value="name">Name A–Z</option>
                <option value="qty">Quantity</option>
              </select>
            </label>
          </Disclosure>
        </div>
      )}
      {rows.length ? (
        <div className="tblwrap">
          <table className="tbl inv" ref={table}>
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
                <tr
                  data-food-id={item.id}
                  className={
                    params.get("new") === item.id || selected === item.id ? "hl" : undefined
                  }
                  key={item.id}
                >
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
                            const result = await run("undoFood", { id: item.id });
                            if (result.ok) {
                              focusAfterRemoval(item);
                              notify("Restored");
                            } else notify(result.error.message);
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
                                className="menu-item"
                                act="invdone"
                                data-id={item.id}
                                data-s="consumed"
                                onClick={() => useFood(item, "consumed")}
                              >
                                Mark as used
                              </Button>
                            ) : (
                              <Button
                                className="menu-item"
                                act="invdone"
                                data-id={item.id}
                                data-s="discarded"
                                onClick={() => useFood(item, "discarded")}
                              >
                                Discard
                              </Button>
                            )}
                            <Button
                              className="menu-item"
                              act="invedit"
                              onClick={() => dialog(<FoodForm popup draft={draftFor(item)} />)}
                            >
                              Edit
                            </Button>
                            {!!item.log.length && (
                              <Button
                                className="menu-item"
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
                          className="menu-item d"
                          onClick={() =>
                            dialog(
                              <Confirm
                                title="Delete this item?"
                                action="Delete"
                                danger
                                submit={async () => {
                                  const result = await run("deleteFood", { id: item.id });
                                  if (result.ok) focusAfterRemoval(item);
                                  return result;
                                }}
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
