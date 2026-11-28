import { Select, SlidingLabel } from "./select.tsx";
import { AreaSearch } from "./area-search.tsx";
import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router";
import { CATEGORIES, catLabel, LOCATIONS, RESCUE_CATS } from "../data.js";
import { listingLedger } from "../domain/model.ts";
import { areaOf, browse, distanceTo, listingStatus } from "../domain/selectors.ts";
import { daysUntil, POLICY } from "../domain/time.ts";
import {
  Avatar,
  Button,
  Card,
  Confirm,
  dateWord,
  Disclosure,
  Empty,
  formatDate,
  formatDeadline,
  formatTime,
  Heading,
  listingCutoff,
  Note,
  PageNavigation,
  Picture,
  rm,
} from "./primitives.tsx";
import { useUI } from "./state.tsx";
import type { ViewData } from "../services/contracts.ts";

export function MarketSearch() {
  const { data, mode, read, run, distance, setDistance, dialog, notify } = useUI();
  const [text, setText] = useState(""),
    [open, setOpen] = useState(false);
  const [matches, setMatches] = useState<ViewData>();
  const searchBox = useRef<HTMLDivElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const locationRequest = useRef(0);
  const [locating, setLocating] = useState(false);
  const navigate = useNavigate(),
    location = useLocation();
  const query = new URLSearchParams(location.search).get("q") || "";
  useEffect(
    () => () => {
      locationRequest.current++;
    },
    [],
  );
  function useMyLocation() {
    const fallback = () => notify("Couldn’t access your location. Choose your area manually.");
    if (!navigator.geolocation) {
      fallback();
      return;
    }
    const request = ++locationRequest.current;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        if (request !== locationRequest.current) return;
        const distance = (area: (typeof LOCATIONS)[number]) =>
          Math.hypot(
            area.ll[0] - coords.latitude,
            (area.ll[1] - coords.longitude) * Math.cos((coords.latitude * Math.PI) / 180),
          );
        const closest = LOCATIONS.reduce((a, b) => (distance(a) <= distance(b) ? a : b));
        const result = await run("area", { id: closest.id });
        if (request !== locationRequest.current) return;
        setLocating(false);
        notify(result.ok ? `Showing food near ${closest.short}` : result.error.message);
      },
      () => {
        if (request !== locationRequest.current) return;
        setLocating(false);
        fallback();
      },
      { timeout: 8000, maximumAge: 600000 },
    );
  }
  function cancelLocationRequest() {
    locationRequest.current++;
    setLocating(false);
  }
  useEffect(() => setText(query), [query]);
  useEffect(() => {
    setOpen(false);
  }, [location.pathname, location.search]);
  useEffect(() => {
    if (!open) return;
    function dismissOutside(event: Event) {
      if (event.target instanceof Node && !searchBox.current?.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", dismissOutside, true);
    document.addEventListener("focusin", dismissOutside);
    return () => {
      document.removeEventListener("pointerdown", dismissOutside, true);
      document.removeEventListener("focusin", dismissOutside);
    };
  }, [open]);
  useEffect(() => {
    if (mode !== "supabase" || !open || !text.trim()) return;
    let active = true;
    const timer = setTimeout(() => {
      void read({ page: "market", search: text, distance })
        .then((result) => {
          if (active) setMatches(result);
        })
        .catch(() => {
          if (active) setMatches(undefined);
        });
    }, 150);
    return () => {
      clearTimeout(timer);
      active = false;
    };
  }, [mode, open, text, distance, read, data.area]);
  const suggestions = browse(mode === "supabase" && matches ? matches : data, text, distance);
  function search(value: string) {
    setText(value);
    setOpen(false);
    void run("recentSearch", { query: value });
    navigate("/market?" + new URLSearchParams({ browse: "1", q: value }));
  }
  return (
    <div className="hdr-search">
      <div className="wrap hs-in">
        <div
          className="searchbox"
          id="searchbox"
          ref={searchBox}
          onKeyDown={(event) => {
            if (event.key !== "Escape" || !open) return;
            searchInput.current?.focus();
            setOpen(false);
          }}
        >
          <form
            id="sform"
            role="search"
            onSubmit={(event) => {
              event.preventDefault();
              search(text);
            }}
          >
            <input
              id="q"
              ref={searchInput}
              aria-label="Search listings"
              autoComplete="off"
              value={text}
              placeholder="Search sealed food near you…"
              onFocus={() => setOpen(true)}
              onClick={() => setOpen(true)}
              onChange={(event) => {
                setText(event.target.value);
                setOpen(true);
              }}
            />
            <button className="go" type="submit">
              Search
            </button>
          </form>
          <div className={"sdrop" + (open ? " open" : "")} id="sdrop">
            {text ? (
              <>
                <Button className="row" onClick={() => search(text)}>
                  <span className="search-query">Search “{text}”</span>
                </Button>
                {suggestions.slice(0, 5).map((item) => (
                  <Link key={item.id} className="row" to={"/item/" + item.id}>
                    {item.name}
                    <small>{rm(item.price)}</small>
                  </Link>
                ))}
                {!suggestions.length && (
                  <p className="mute px-4 py-2">No matching listings nearby.</p>
                )}
              </>
            ) : (
              <>
                {!!data.recent.length && (
                  <h6>
                    Recent searches
                    <Button
                      className="link"
                      onClick={() => {
                        searchInput.current?.focus();
                        void run("clearSearch", undefined);
                      }}
                    >
                      Clear
                    </Button>
                  </h6>
                )}
                {data.recent.map((value) => (
                  <Button className="row" key={value} onClick={() => search(value)}>
                    {value}
                  </Button>
                ))}
                <h6>Browse by category</h6>
                {CATEGORIES.filter((category) => RESCUE_CATS.includes(category.id)).map(
                  (category) => (
                    <Link
                      className="row"
                      key={category.id}
                      to={"/market?browse=1&cat=" + category.id}
                    >
                      {category.label}
                    </Link>
                  ),
                )}
              </>
            )}
          </div>
        </div>
        <div className="locgrp">
          <AreaSearch inline onBegin={cancelLocationRequest} />
          <Button
            className="hbtn locbtn locbtn-mobile"
            act="loc"
            onClick={(event) => {
              event.currentTarget.focus();
              cancelLocationRequest();
              dialog(<AreaPicker />);
            }}
          >
            <span className="lt">
              <small>Your area</small>
              <SlidingLabel id="locName" text={areaOf(data).short} />
            </span>
          </Button>
          <Button
            className="hbtn locate-btn"
            act="use-location"
            disabled={locating}
            onClick={useMyLocation}
          >
            {locating ? "Locating…" : "Use my location"}
          </Button>
          <Select
            className="sel distsel"
            id="hdr-dist"
            aria-label="Approximate distance"
            value={distance}
            onChange={(event) =>
              setDistance(event.target.value === "all" ? "all" : Number(event.target.value))
            }
          >
            {[2, 5, 10, "all"].map((value) => (
              <option key={value} value={value}>
                {value === "all" ? "Show all" : `Within ~${value} km`}
              </option>
            ))}
          </Select>
        </div>
      </div>
    </div>
  );
}

function AreaPicker() {
  const { close } = useUI();
  return (
    <>
      <h3 id="m-title">Choose your area</h3>
      <p className="mute">Distances are approximate and based on your selected neighbourhood.</p>
      <AreaSearch onSelected={close} />
      <div className="macts">
        <Button className="btn sec" onClick={close}>
          Close
        </Button>
      </div>
    </>
  );
}

export function Market() {
  const { data, distance, setDistance } = useUI();
  const [params, setParams] = useSearchParams(),
    [filters, setFilters] = useState(false);
  const filterDrawer = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const mobile = window.matchMedia("(max-width: 1024px)");
    const closeOnDesktop = () => {
      if (!mobile.matches) filterDrawer.current?.close();
    };
    mobile.addEventListener("change", closeOnDesktop);
    return () => mobile.removeEventListener("change", closeOnDesktop);
  }, []);
  const min = params.get("min") || "",
    max = params.get("max") || "",
    expiry = params.get("expiry") || "all";
  const category = params.get("cat"),
    search = params.get("q") || "",
    sort = params.get("sort") || "near";
  const isHome = !params.has("browse") && !category && !search;
  const nearby = browse(data, search, distance);
  const today = Date.now(),
    results = nearby.filter(
      (l) =>
        (!category || l.cat === category) &&
        (!min || l.price >= +min) &&
        (!max || l.price <= +max) &&
        (expiry === "all" || daysUntil(l.expiry, today) <= +expiry),
    );
  if (sort === "collect") results.sort((a, b) => listingCutoff(a) - listingCutoff(b));
  if (sort === "low") results.sort((a, b) => a.price - b.price);
  if (sort === "disc") results.sort((a, b) => 1 - b.price / b.orig - (1 - a.price / a.orig));
  if (sort === "new") results.sort((a, b) => b.postedAt - a.postedAt);
  if (sort === "exp") results.sort((a, b) => a.expiry.localeCompare(b.expiry));
  const cards = (items: typeof results) => (
    <div className="grid">
      {items.map((l) => (
        <Card
          key={l.id}
          listing={l}
          seller={data.stores[l.seller]}
          distance={distanceTo(data, l.seller)}
        />
      ))}
    </div>
  );
  const filtered = !!category || !!min || !!max || expiry !== "all";
  const noResults = (
    <Empty
      title="No listings match right now."
      text={
        search
          ? "Clear the search to see offers with your current filters."
          : filtered
            ? "Try removing your filters."
            : "Try another area or widen the distance."
      }
    >
      {search ? (
        <Button onClick={() => update("q", "")}>Clear search</Button>
      ) : filtered ? (
        <Button onClick={reset}>Reset filters</Button>
      ) : (
        <>
          {distance !== "all" && Number(distance) < 10 && (
            <Button act="setdist" data-v="10" onClick={() => setDistance(10)}>
              Widen to ~10 km
            </Button>
          )}
          {distance !== "all" && (
            <Button
              act="setdist"
              data-v="all"
              className="btn sec"
              onClick={() => setDistance("all")}
            >
              Show all distances
            </Button>
          )}
        </>
      )}
    </Empty>
  );
  function update(name: string, value: string) {
    const next = new URLSearchParams(params);
    if (name !== "offset") next.delete("offset");
    if (value) next.set(name, value);
    else next.delete(name);
    setParams(next);
  }
  function reset() {
    setDistance(5);
    setParams({ browse: "1" });
  }

  if (isHome)
    return (
      <div id="home">
        <div className="wrap market-home">
          <header className="market-intro">
            <h1>Find food</h1>
          </header>
          <section className="market-offers" aria-labelledby="nearby-heading">
            <div className="sec-h">
              <div>
                <h2 id="nearby-heading">Near {areaOf(data).short}</h2>
                <p>Nearest first · distances are approximate</p>
              </div>
              <Button className="link" act="seeall" onClick={() => setParams({ browse: "1" })}>
                Browse all
              </Button>
            </div>
            {nearby.length ? cards(nearby.slice(0, 8)) : noResults}
          </section>
        </div>
        <section className="band alt">
          <div className="wrap">
            <Disclosure title="How pickup works" className="flat">
              <ol className="how">
                <li>
                  <b>1</b>
                  <div>
                    <h3>Reserve</h3>
                    <p>Choose a quantity.</p>
                  </div>
                </li>
                <li>
                  <b>2</b>
                  <div>
                    <h3>Seller accepts</h3>
                    <p>Within 2 hours.</p>
                  </div>
                </li>
                <li>
                  <b>3</b>
                  <div>
                    <h3>Collect and pay</h3>
                    <p>Show your pickup code at the shop.</p>
                  </div>
                </li>
              </ol>
            </Disclosure>
            <p className="rescue-note">Check the seal and printed date at pickup.</p>
          </div>
        </section>
      </div>
    );

  return (
    <div className="wrap">
      <section className="browse">
        <dialog
          ref={filterDrawer}
          className="filters"
          id="filters"
          aria-label="Filters"
          role={filters ? undefined : "complementary"}
          onClose={() => setFilters(false)}
          onClick={(event) => {
            if (!filters || event.target !== event.currentTarget) return;
            const bounds = event.currentTarget.getBoundingClientRect();
            if (event.clientX >= bounds.right) event.currentTarget.close();
          }}
        >
          <div className="fgrp fhead">
            <b>Filters</b>
            <Button className="link sm" act="freset" onClick={reset}>
              Reset filters
            </Button>
            <Button className="link sm mobile-only" onClick={() => filterDrawer.current?.close()}>
              Close
            </Button>
          </div>
          <div className="fgrp filter-fields">
            <label className="filter-date">
              Date on pack{" "}
              <Select
                data-f="expiry"
                value={expiry}
                onChange={(event) => update("expiry", event.target.value)}
              >
                <option value="all">Any date</option>
                <option value="3">Within 3 days</option>
                <option value="7">Within 7 days</option>
              </Select>
            </label>
            <div className="pricefields">
              <label>
                <span>Min (RM)</span>
                <input
                  type="number"
                  min={0}
                  data-f="min"
                  value={min}
                  onChange={(event) => update("min", event.target.value)}
                />
              </label>
              <label>
                <span>Max (RM)</span>
                <input
                  type="number"
                  min={0}
                  data-f="max"
                  value={max}
                  onChange={(event) => update("max", event.target.value)}
                />
              </label>
            </div>
            <div className="pills">
              {[
                ["", "5", "Up to RM5"],
                ["5", "10", "RM5–RM10"],
                ["10", "20", "RM10–RM20"],
                ["20", "", "RM20+"],
              ].map(([low, high, label]) => (
                <Button
                  className={"pill" + (low === min && high === max ? " on" : "")}
                  key={label}
                  aria-pressed={low === min && high === max}
                  onClick={() => {
                    const next = new URLSearchParams(params);
                    next.delete("offset");
                    if (low && (min !== low || max !== high)) next.set("min", low);
                    else next.delete("min");
                    if (high && (min !== low || max !== high)) next.set("max", high);
                    else next.delete("max");
                    setParams(next);
                  }}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>
          <div className="fgrp mobile-only filter-actions">
            <Button className="btn block" onClick={() => filterDrawer.current?.close()}>
              Show {results.length} {results.length === 1 ? "result" : "results"}
            </Button>
          </div>
        </dialog>
        <div id="results">
          <div className="toolbar">
            <b>
              {results.length} listings near {areaOf(data).short}
            </b>
            <Button
              className="btn sec sm filter-toggle"
              aria-expanded={filters}
              aria-controls="filters"
              onClick={(event) => {
                event.currentTarget.focus();
                filterDrawer.current?.showModal();
                setFilters(true);
              }}
            >
              Filters
            </Button>
            <label className="mute sm" htmlFor="sort">
              Sort by
            </label>
            <Select
              className="sel"
              id="sort"
              value={sort}
              onChange={(event) => update("sort", event.target.value)}
            >
              {[
                ["near", "Nearest first"],
                ["collect", "Collect soonest"],
                ["low", "Lowest price"],
                ["disc", "Highest discount"],
                ["new", "Newest listings"],
                ["exp", "Date soonest"],
              ].map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
          <div className="tags">
            {search && <span className="tag">“{search}”</span>}
            {category && <span className="tag">{catLabel(category)}</span>}
            {min && <span className="tag">From RM{min}</span>}
            {max && <span className="tag">Up to RM{max}</span>}
          </div>
          {results.length ? cards(results) : noResults}
          <PageNavigation />
        </div>
      </section>
    </div>
  );
}

export function Item() {
  const { id } = useParams(),
    { data, mode, dialog, run } = useUI(),
    navigate = useNavigate();
  const [qty, setQty] = useState(1),
    [gallery, setGallery] = useState(0);
  useEffect(() => {
    setQty(1);
    setGallery(0);
  }, [id]);
  const listing = data.listings.find((item) => item.id === id);
  if (!listing || listing.status === "removed")
    return (
      <Empty title="Listing not available">
        <Link className="btn" to="/market">
          Back to marketplace
        </Link>
      </Empty>
    );
  const seller = data.stores[listing.seller],
    own = listing.seller === data.session?.user.sellerId;
  const ledger = listingLedger(listing, data.reservations);
  const live = listingStatus(listing, data.reservations) === "live";
  const tooLate = Date.now() > listingCutoff(listing) - POLICY.leadMin * 60_000;
  const imgs = listing.photos;
  const related = browse(data, "", "all").filter((item) => item.id !== listing.id);
  const moreFromSeller = related.filter((item) => item.seller === listing.seller).slice(0, 4);
  const similar = related
    .filter((item) => item.cat === listing.cat && item.seller !== listing.seller)
    .slice(0, 4);
  const sections = [
    [seller ? "More from " + seller.name : "More from this seller", moreFromSeller],
    ["Similar nearby", similar],
  ] as const;
  const myRequests = data.reservations.filter(
    (record) =>
      record.listingId === listing.id &&
      record.buyerId === data.session?.user.id &&
      ["pending", "confirmed"].includes(record.status),
  );
  const count = Math.min(qty, Math.max(1, ledger.avail));
  function changeQuantity(delta: -1 | 1, control: HTMLButtonElement) {
    const next = count + delta;
    const disablesControl = delta === -1 ? next === 1 : next === ledger.avail;
    if (disablesControl && document.activeElement === control) {
      const opposite = control.parentElement?.querySelector<HTMLButtonElement>(
        `[data-d="${-delta}"]`,
      );
      requestAnimationFrame(() => {
        if (document.activeElement === document.body || document.activeElement === control)
          opposite?.focus();
      });
    }
    setQty(next);
  }
  const chat = () => {
    void run("openThread", { sellerId: listing.seller, listingId: listing.id });
    navigate("?chat=" + listing.seller);
  };
  function reserve() {
    if (!listing) return;
    const requestId = crypto.randomUUID();
    dialog(
      <Confirm
        title="Request this reservation?"
        action="Request reservation"
        pendingLabel="Requesting…"
        submit={async () => {
          const result = await run("reserveListing", { id: listing.id, qty: count, requestId });
          if (result.ok) navigate("/reservation/" + result.value);
          return result;
        }}
      >
        <dl className="deflist tight">
          <dt>Total</dt>
          <dd>{rm(listing.price * count)} · paid in person</dd>
          <dt>Listing cutoff</dt>
          <dd>{formatDeadline(listingCutoff(listing))}</dd>
        </dl>
        <p>
          Your request holds the selected units. The seller has two hours to respond. If accepted,
          you’ll get a 4-digit pickup code and your own pickup deadline, which may be earlier than
          the listing cutoff. The agreed price and pickup details are locked for this reservation.
        </p>
        <div className="pickup-safety">
          <div>
            <svg className="ico sm" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 3 2.5 20h19L12 3Z M12 9v4 M12 16v.1" />
            </svg>
            <h3>Food safety · Seller-declared, unverified</h3>
          </div>
          <p>At pickup, check the seal, printed date, and allergen label.</p>
        </div>
      </Confirm>,
    );
  }
  return (
    <>
      <div className="crumbs">
        <Link to="/market">Find food</Link> › {catLabel(listing.cat)}
      </div>
      <article className="detail product-detail">
        <header className="product-heading">
          <h1 className="d-title">{listing.name}</h1>
          <div className="d-price">
            <b>{rm(listing.price)}</b> <s>{rm(listing.orig)}</s>
          </div>
        </header>
        <section className="box pickup-panel" aria-labelledby="pickup-heading">
          <h2 id="pickup-heading">Reserve for pickup</h2>
          <dl className="deflist tight pickup-facts">
            <dt>{dateWord(listing.expiryType)}</dt>
            <dd>
              <b>{formatDate(listing.expiry)}</b>
            </dd>
            <dt>Listing cutoff</dt>
            <dd>
              <b>{formatDeadline(listingCutoff(listing))}</b>
              <br />
              {formatTime(listing.pickFrom)}–{formatTime(listing.pickTo)} daily
            </dd>
            {seller && (
              <>
                <dt className="pickup-wide">Pickup</dt>
                <dd className="pickup-wide">
                  {seller.name}
                  <br />
                  {seller.area}
                </dd>
              </>
            )}
            <dt className="pickup-wide">Instructions</dt>
            <dd className="pickup-wide">{listing.instr}</dd>
          </dl>
          {myRequests.map((record) => (
            <Note key={record.id}>
              You reserved {record.qty} ·{" "}
              <Link className="link" to={"/reservation/" + record.id}>
                View reservation
              </Link>
            </Note>
          ))}
          {own ? (
            <Note>
              This is your listing. {ledger.avail} units available.{" "}
              <Link className="link" to="/listings">
                Manage listings
              </Link>
            </Note>
          ) : !live ? (
            <Note danger>This listing is unavailable.</Note>
          ) : (
            <>
              <div className="resv-row">
                <div>
                  <b>Quantity</b>
                  <div className="mute sm">{ledger.avail} units available</div>
                </div>
                <div className="qty">
                  <Button
                    act="qty"
                    data-d="-1"
                    className="hbtn"
                    aria-label="Decrease quantity"
                    disabled={count <= 1}
                    onClick={(event) => changeQuantity(-1, event.currentTarget)}
                  >
                    −
                  </Button>
                  <b id="qtyv" aria-live="polite">
                    {count}
                  </b>
                  <Button
                    act="qty"
                    data-d="1"
                    className="hbtn"
                    aria-label="Increase quantity"
                    disabled={count >= ledger.avail}
                    onClick={(event) => changeQuantity(1, event.currentTarget)}
                  >
                    +
                  </Button>
                </div>
              </div>
              <div className="total">
                <span>Total · pay in person</span>
                <b>{rm(listing.price * count)}</b>
              </div>
              {tooLate && (
                <Note danger>The collection window closes too soon to reserve this.</Note>
              )}
              <Button act="reserve" className="btn block sage" disabled={tooLate} onClick={reserve}>
                Reserve
              </Button>
            </>
          )}
        </section>
        <div className="product-gallery">
          {imgs.length === 0 ? (
            <div className="no-seller-photo">No seller photo</div>
          ) : (
            <div
              role="group"
              aria-label="Product photos"
              onKeyDown={(event) => {
                if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
                  event.preventDefault();
                  setGallery(
                    (value) =>
                      (value + imgs.length + (event.key === "ArrowRight" ? 1 : -1)) % imgs.length,
                  );
                }
              }}
            >
              <div className="gal-main">
                <Picture src={imgs[gallery % imgs.length]} alt={listing.name} />
                {imgs.length > 1 && (
                  <>
                    <Button
                      className="gal-nav l"
                      aria-label="Previous image"
                      onClick={() => setGallery((gallery + imgs.length - 1) % imgs.length)}
                    >
                      ‹
                    </Button>
                    <Button
                      className="gal-nav r"
                      aria-label="Next image"
                      onClick={() => setGallery((gallery + 1) % imgs.length)}
                    >
                      ›
                    </Button>
                  </>
                )}
                {imgs.length > 1 && (
                  <span className="gal-count">
                    {(gallery % imgs.length) + 1} / {imgs.length}
                  </span>
                )}
              </div>
              {imgs.length > 1 && (
                <div className="thumbs">
                  {imgs.map((src, index) => (
                    <Button
                      className={index === gallery ? "on" : ""}
                      aria-label={"Image " + (index + 1)}
                      aria-pressed={index === gallery}
                      key={index}
                      onClick={() => setGallery(index)}
                    >
                      <Picture src={src} />
                    </Button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="product-support">
          <section className="box">
            <h2>Description</h2>
            <p>{listing.desc}</p>
          </section>
          {seller && (
            <div className="box">
              <h2>Seller</h2>
              <div className="seller">
                <Avatar name={seller.name} />
                <div>
                  <b>{seller.name}</b>
                </div>
              </div>
              <div className="row-acts">
                <Link className="btn sec" to={"/seller/" + seller.id}>
                  Seller profile
                </Link>
                {mode === "demo" && !own && (
                  <Button
                    className="btn sec"
                    act="chat"
                    onClick={(event) => {
                      event.currentTarget.focus();
                      chat();
                    }}
                  >
                    Try demo chat
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </article>
      {sections.map(
        ([title, items]) =>
          !!items.length && (
            <section className="sect" key={title}>
              <h2>{title}</h2>
              <div className="grid">
                {items.map((match) => (
                  <Card
                    key={match.id}
                    listing={match}
                    seller={data.stores[match.seller]}
                    distance={distanceTo(data, match.seller)}
                  />
                ))}
              </div>
            </section>
          ),
      )}
    </>
  );
}

export function Seller() {
  const { data, mode, run } = useUI(),
    { id } = useParams(),
    navigate = useNavigate();
  const store = data.stores[id || ""];
  if (!store)
    return (
      <Empty title="Seller not found">
        <Link className="btn" to="/market">
          Back to marketplace
        </Link>
      </Empty>
    );
  const listings = browse(data, "", "all").filter((listing) => listing.seller === id);
  return (
    <>
      <Heading
        title={store.name}
        sub={store.area}
        action={
          mode === "demo" && (
            <Button
              className="btn sec"
              onClick={(event) => {
                event.currentTarget.focus();
                void run("openThread", { sellerId: store.id });
                navigate("?chat=" + store.id);
              }}
            >
              Try demo chat
            </Button>
          )
        }
      />
      <div className="box sellerhead">
        <div className="seller">
          <Avatar large name={store.name} />
          <div>
            <b>{store.name}</b>
            <br />
            {store.hours}
            <p className="mute">
              {store.sample ? "Fictional sample seller" : "Unverified retailer"} · ≈
              {distanceTo(data, store.id)} km away
            </p>
          </div>
        </div>
      </div>
      <section className="sect">
        <h2>Available listings</h2>
        {listings.length ? (
          <div className="grid">
            {listings.map((listing) => (
              <Card key={listing.id} listing={listing} seller={store} />
            ))}
          </div>
        ) : (
          <Empty title="No live listings right now" />
        )}
      </section>
    </>
  );
}

export function Inbox({ sellerId, close }: { sellerId: string; close: () => void }) {
  const { data, run } = useUI();
  const [params, setParams] = useSearchParams();
  const panel = useRef<HTMLDialogElement>(null);
  useLayoutEffect(() => {
    const element = panel.current;
    if (!element) return;
    const previous = document.activeElement;
    element.showModal();
    return () => {
      element.close();
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
    };
  }, []);
  useLayoutEffect(() => {
    panel.current?.querySelector<HTMLButtonElement>("[data-act=closechat]")?.focus();
  }, [sellerId]);
  const threads = Object.values(data.threads || {}),
    thread = threads.find((t) => t.sellerId === sellerId);
  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget,
      text = String(new FormData(form).get("message") || "");
    if ((await run("sendMessage", { sellerId, text })).ok) form.reset();
  }
  return (
    <dialog
      ref={panel}
      className="drawer"
      aria-label="Demo messages"
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const controls = event.currentTarget.querySelectorAll<HTMLElement>(
          "button:not([disabled]), input:not([disabled])",
        );
        const edge = event.shiftKey ? controls[0] : controls[controls.length - 1];
        if (document.activeElement !== edge) return;
        event.preventDefault();
        (event.shiftKey ? controls[controls.length - 1] : controls[0])?.focus();
      }}
      onClick={(event) => {
        if (
          event.target === event.currentTarget &&
          event.clientX < event.currentTarget.getBoundingClientRect().left
        )
          close();
      }}
    >
      <div className="dh">
        <div className="t">
          <b>{data.stores[sellerId]?.name || "Demo messages"}</b>
          {data.stores[sellerId] && <small>Demo chat</small>}
        </div>
        <Button act="closechat" className="hbtn" aria-label="Close messages" onClick={close}>
          ×
        </Button>
      </div>
      {thread ? (
        <>
          <div className="msgs" id="msgs">
            {thread.msgs.map((msg, i) => (
              <div className={"msg " + msg.from} key={i}>
                {msg.text}
              </div>
            ))}
          </div>
          <div className="quick">
            {[
              "Is this still available?",
              "What time can I collect?",
              "I’m on my way to collect.",
            ].map((text) => (
              <Button
                key={text}
                className="pill"
                onClick={() => run("sendMessage", { sellerId, text })}
              >
                {text}
              </Button>
            ))}
          </div>
          <form className="cform" onSubmit={send}>
            <input id="cmsg" name="message" aria-label="Message" placeholder="Write a message…" />
            <button type="submit" className="btn">
              Send
            </button>
          </form>
        </>
      ) : (
        <div>
          {threads.length ? (
            threads.map((t) => (
              <Button
                className="thread"
                key={t.sellerId}
                onClick={() => {
                  const next = new URLSearchParams(params);
                  next.set("chat", t.sellerId);
                  setParams(next);
                }}
              >
                {data.stores[t.sellerId]?.name}
              </Button>
            ))
          ) : (
            <p className="mute p-6">No conversations yet.</p>
          )}
        </div>
      )}
    </dialog>
  );
}
