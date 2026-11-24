import {
  cloneElement,
  isValidElement,
  useEffect,
  useRef,
  useState,
  type AriaAttributes,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import { Link, useSearchParams } from "react-router";
import { CATEGORIES, photo, RESCUE_CATS, catLabel } from "../data.js";
import type { Listing, Store, UnitLedger } from "../domain/model.ts";
import type { DateType } from "../domain/time.ts";
import { STORE_ZONE, daysUntil, formatDeadline, storeTime } from "../domain/time.ts";
import type { Result } from "../services/contracts.ts";
import unavailableImage from "../image-unavailable.svg";
import { useUI } from "./state.tsx";

export const rm = (value: number) => "RM" + value.toFixed(2);
export const dateWord = (type: DateType) => (type === "use-by" ? "Use by" : "Best before");
export const formatDate = (value: string) =>
  value
    ? new Date(value + "T00:00:00Z").toLocaleDateString("en-MY", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      })
    : "–";
export const formatTime = (value: string) =>
  new Date(storeTime("2000-01-01", value)).toLocaleTimeString("en-MY", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: STORE_ZONE,
  });
export { formatDeadline } from "../domain/time.ts";
export const listingCutoff = (l: Listing) => storeTime(l.pickupUntil, l.pickTo);
export const units = (n: number) => `${n} unit${n === 1 ? "" : "s"}`;
export const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

export function Button({
  act,
  className = "btn",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { act?: string }) {
  return (
    <button className={className} type="button" data-act={act} {...props}>
      {children}
    </button>
  );
}
export function Heading({
  title,
  sub,
  action,
  group,
}: {
  title: string;
  sub?: string;
  action?: ReactNode;
  group?: string;
}) {
  return (
    <div className="pagehead flex flex-wrap items-end justify-between gap-3">
      <div>
        {group && <span className={"kicker k-" + group.toLowerCase()}>{group}</span>}
        <h1>{title}</h1>
        {sub && <p className="mute">{sub}</p>}
      </div>
      {action && <div className="ph-acts">{action}</div>}
    </div>
  );
}
export function Empty({
  title,
  text,
  children,
}: {
  title: string;
  text?: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <h2>{title}</h2>
      {text && <p>{text}</p>}
      {children && <div className="acts">{children}</div>}
    </div>
  );
}
export function PageNavigation() {
  const { data } = useUI(),
    [params, setParams] = useSearchParams();
  const offset = Math.max(0, Number(params.get("offset")) || 0);
  if (!data.pageSize || (!offset && !data.more)) return null;
  const step = data.pageSize;
  function change(page: number) {
    const next = new URLSearchParams(params);
    if (page) next.set("offset", String(page));
    else next.delete("offset");
    setParams(next);
  }
  return (
    <div className="row-acts" aria-label="Result pages">
      {offset > 0 && (
        <Button className="btn sec" onClick={() => change(Math.max(0, offset - step))}>
          Previous page
        </Button>
      )}
      {data.more && (
        <Button className="btn sec" onClick={() => change(offset + step)}>
          Next page
        </Button>
      )}
    </div>
  );
}
export function Note({ children, danger = false }: { children: ReactNode; danger?: boolean }) {
  return (
    <p className={"note" + (danger ? " warn" : "")}>
      <span>{children}</span>
    </p>
  );
}
export function Disclosure({
  title,
  children,
  className = "",
  forceOpen,
}: {
  title: ReactNode;
  children: ReactNode;
  className?: string;
  forceOpen?: boolean;
}) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    if (forceOpen && ref.current) ref.current.open = true;
  }, [forceOpen]);
  return (
    <details className={"disc " + className} ref={ref}>
      <summary>{title}</summary>
      <div className="disc-b">{children}</div>
    </details>
  );
}
export function Menu({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    function close() {
      if (ref.current) ref.current.open = false;
    }
    function outside(event: MouseEvent) {
      if (event.target instanceof Node && !ref.current?.contains(event.target)) close();
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }
    document.addEventListener("click", outside);
    document.addEventListener("keydown", escape);
    window.addEventListener("scroll", close, { passive: true });
    return () => {
      document.removeEventListener("click", outside);
      document.removeEventListener("keydown", escape);
      window.removeEventListener("scroll", close);
    };
  }, []);
  return (
    <details
      className="more"
      ref={ref}
      onToggle={(event) => {
        const element = event.currentTarget;
        if (!element.open) return;
        const anchor = element.querySelector("summary")?.getBoundingClientRect(),
          menu = element.querySelector<HTMLElement>(".more-m");
        if (!anchor || !menu) return;
        const { offsetWidth: w, offsetHeight: h } = menu;
        menu.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, anchor.right - w)) + "px";
        menu.style.top =
          Math.max(
            8,
            anchor.bottom + h + 8 > window.innerHeight ? anchor.top - h - 6 : anchor.bottom + 6,
          ) + "px";
      }}
    >
      <summary className="ibtn icon" aria-label="More actions">
        ⋯
      </summary>
      <div
        className="more-m"
        onClick={() => {
          if (ref.current) ref.current.open = false;
        }}
      >
        {children}
      </div>
    </details>
  );
}
export function Tabs({
  items,
}: {
  items: {
    label: string;
    active: boolean;
    count?: number;
    to?: string;
    click?: () => void;
    id?: string;
  }[];
}) {
  return (
    <div className="tabs">
      {items.map((item) => {
        const cls = "tab" + (item.active ? " on" : "");
        const text = (
          <>
            {item.label}
            {item.count !== undefined && <i>{item.count}</i>}
          </>
        );
        return item.to ? (
          <Link
            to={item.to}
            key={item.label}
            className={cls}
            aria-current={item.active ? "page" : undefined}
          >
            {text}
          </Link>
        ) : (
          <Button
            key={item.label}
            className={cls}
            onClick={item.click}
            data-t={item.id}
            act={item.id ? "bttab" : undefined}
          >
            {text}
          </Button>
        );
      })}
    </div>
  );
}
export function Field({
  id,
  label,
  error,
  children,
  hint,
}: {
  id: string;
  label: ReactNode;
  error?: string;
  children: ReactNode;
  hint?: string;
}) {
  const control =
    isValidElement<AriaAttributes & { id?: string }>(children) &&
    children.props.id === id &&
    (children.type === "input" || children.type === "select" || children.type === "textarea");
  const hintId = id + "-hint",
    errorId = id + "-error";
  const content = control
    ? cloneElement(children, {
        "aria-invalid": error ? true : children.props["aria-invalid"],
        "aria-describedby":
          [children.props["aria-describedby"], hint && hintId, error && errorId]
            .filter(Boolean)
            .join(" ") || undefined,
      })
    : children;
  return (
    <div className={"fld" + (error ? " err" : "")} data-fk={id.split("-").slice(1).join("-")}>
      <label className="l" htmlFor={id}>
        {label}
      </label>
      {content}
      {hint && (
        <div id={hintId} className="hint">
          {hint}
        </div>
      )}
      {error && (
        <div id={errorId} className="e" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}
export function useFormErrorFocus(error: string | object | undefined) {
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (!error) return;
    const frame = requestAnimationFrame(() => {
      const invalid = Array.from(
        form.current?.querySelectorAll<HTMLElement>('[aria-invalid="true"]:not([disabled])') || [],
      ).find((element) => element.offsetParent);
      const target = invalid || form.current?.querySelector<HTMLElement>("[data-form-error]");
      target?.focus({ preventScroll: true });
      target?.scrollIntoView({ block: "center", behavior: "instant" });
    });
    return () => cancelAnimationFrame(frame);
  }, [error]);
  return form;
}
export function Categories({ rescue = false }: { rescue?: boolean }) {
  return (
    <>
      <option value="">Select a category</option>
      {CATEGORIES.filter((c) => c.id !== "all" && (!rescue || RESCUE_CATS.includes(c.id))).map(
        (c) => (
          <option value={c.id} key={c.id}>
            {c.label}
          </option>
        ),
      )}
    </>
  );
}
export function DateTypeFields({
  prefix,
  value,
  onChange,
  disabled,
  error,
}: {
  prefix: string;
  value: DateType | "";
  onChange: (value: DateType) => void;
  disabled?: boolean;
  error?: string;
}) {
  return (
    <div className="seg-radio" role="radiogroup" aria-label="Date type on the pack">
      {(["best-before", "use-by"] as const).map((type) => (
        <label className={value === type ? "on" : ""} key={type}>
          <input
            name={prefix + "-et"}
            type="radio"
            data-b={prefix + ".expiryType"}
            value={type}
            checked={value === type}
            disabled={disabled}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? prefix + "-date-type-error" : undefined}
            onChange={() => onChange(type)}
          />
          <b>{dateWord(type)}</b>
          <small>{type === "use-by" ? "A safety date" : "A quality date"}</small>
        </label>
      ))}
      {error && (
        <p id={prefix + "-date-type-error"} className="hot date-type-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
export function Check({
  binding,
  children,
  ...attrs
}: React.InputHTMLAttributes<HTMLInputElement> & { binding?: string; children: ReactNode }) {
  return (
    <label className="chk">
      <input type="checkbox" data-b={binding} {...attrs} />
      {children}
    </label>
  );
}
export function Confirm({
  title,
  children,
  action,
  submit,
  danger,
}: {
  title: string;
  children: ReactNode;
  action: string;
  submit: () => Promise<Result<unknown> | undefined>;
  danger?: boolean;
}) {
  const { close } = useUI();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <>
      <h3 id="m-title">{title}</h3>
      <div className="mbody">{children}</div>
      {error && (
        <p role="alert" className="hot">
          {error}
        </p>
      )}
      <div className="macts">
        <Button className="btn sec" act="mclose" onClick={close}>
          Cancel
        </Button>
        <Button
          act="mok"
          className={"btn " + (danger ? "danger" : "sage")}
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              const result = await submit();
              if (result && !result.ok) setError(result.error.message);
              else close();
            } finally {
              setBusy(false);
            }
          }}
        >
          {action}
        </Button>
      </div>
    </>
  );
}
export function Badge({ children, tone = "" }: { children: ReactNode; tone?: string }) {
  return <span className={"sp " + tone}>{children}</span>;
}
export function Picture({
  src,
  alt = "",
  onError,
  ...props
}: React.ImgHTMLAttributes<HTMLImageElement>) {
  const image = useRef<HTMLImageElement>(null);
  const [failedSrc, setFailedSrc] = useState<string>();
  const unavailable = !src || failedSrc === src;
  useEffect(() => {
    if (!unavailable && image.current?.complete && image.current.naturalWidth === 0)
      setFailedSrc(src);
  }, [src, unavailable]);
  return (
    <img
      {...props}
      ref={image}
      alt={unavailable && alt ? `${alt} · image unavailable` : alt}
      src={unavailable ? unavailableImage : src}
      srcSet={unavailable ? undefined : props.srcSet}
      data-image-unavailable={unavailable || undefined}
      onError={(event) => {
        if (!unavailable) setFailedSrc(src);
        onError?.(event);
      }}
    />
  );
}
export function Avatar({ name, large }: { name: string; large?: boolean }) {
  return <span className={"avatar " + (large ? "lg" : "md")}>{initials(name)}</span>;
}
export function ProductCell({
  item,
  to,
  detail,
}: {
  item: { name: string; kind: string; cat?: string; photo?: string | null };
  to?: string;
  detail?: ReactNode;
}) {
  return (
    <td className="pc">
      <div className="pcell">
        <Picture src={item.photo || photo(item.kind, 0, 200)} />
        <div>
          {to ? (
            <Link to={to}>
              <b>{item.name}</b>
            </Link>
          ) : (
            <b>{item.name}</b>
          )}
          <span className="mute sm">{detail || (item.cat && catLabel(item.cat))}</span>
        </div>
      </div>
    </td>
  );
}
export function UnitBar({ ledger }: { ledger: UnitLedger }) {
  const { avail, held, handed, withdrawn, total } = ledger;
  return (
    <div className="units">
      <div
        className="ubar"
        role="img"
        aria-label={`${avail} available, ${held} held, ${handed} handed over, ${withdrawn} withdrawn of ${total} listed`}
      >
        {[
          [avail, "a"],
          [held, "h"],
          [handed, "d"],
          [withdrawn, "w"],
        ].map(
          ([qty, cls]) =>
            Number(qty) > 0 && <i className={String(cls)} style={{ flex: qty }} key={cls} />,
        )}
      </div>
      <span className="ulg">
        <b>{avail}</b> available · <b>{held}</b> held · <b>{handed}</b> handed over
        {withdrawn > 0 && <> · {withdrawn} withdrawn</>} <span className="mute">of {total}</span>
      </span>
    </div>
  );
}
export function Card({
  listing,
  seller,
  distance,
  preview = false,
}: {
  listing: Listing;
  seller?: Store;
  distance?: number;
  preview?: boolean;
}) {
  const { name, photos, price, orig, expiry, expiryType } = listing;
  const discount = orig > price && price > 0 ? Math.round((1 - price / orig) * 100) : 0;
  const contents = (
    <>
      <div className="im">
        <Picture src={photos[0] || photo(listing.kind)} alt={name} loading="lazy" />
        {!photos.length && <span className="illus">Illustrative photo</span>}
      </div>
      <div className="bd">
        <div className="nm">{name}</div>
        <div className="price">
          <b>{rm(price)}</b>
          {orig > 0 && <s>{rm(orig)}</s>}
          {discount > 0 && <span className="card-savings">−{discount}%</span>}
        </div>
        <div className="meta">{seller?.name}</div>
        <div className="meta">
          {distance !== undefined && <>≈{distance} km · </>}
          {listing.units?.avail ?? listing.total} left
        </div>
        <div className="card-dates">
          <div className="card-printed-date">
            <span className={"dtype" + (expiryType === "use-by" ? " use" : "")}>
              {dateWord(expiryType)}
            </span>{" "}
            <time dateTime={expiry}>{formatDate(expiry)}</time>
          </div>
          {listing.pickupUntil && listing.pickTo && (
            <div className="card-pickup">
              <b>Listing cutoff</b> {formatDeadline(listingCutoff(listing))}
            </div>
          )}
        </div>
      </div>
    </>
  );
  return preview ? (
    <div className="card">{contents}</div>
  ) : (
    <Link className="card" to={"/item/" + listing.id}>
      {contents}
    </Link>
  );
}
export function DateBadge({ expiry, type }: { expiry: string; type: DateType }) {
  const days = daysUntil(expiry, Date.now());
  return (
    <div className="datecell">
      <Badge
        tone={days < 0 ? "r solid" : days <= 1 ? "r" : days <= 3 ? "o" : days <= 7 ? "y" : "g"}
      >
        {days < 0
          ? "Past date"
          : days === 0
            ? "Expires today"
            : days === 1
              ? "Expires tomorrow"
              : days + " days left"}
      </Badge>
      <span className="dl">
        {dateWord(type)} {formatDate(expiry)}
      </span>
    </div>
  );
}
