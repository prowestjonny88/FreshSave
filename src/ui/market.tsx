import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router";
import { CATEGORIES, catLabel, LOCATIONS, photo, RESCUE_CATS } from "../data.js";
import { listingLedger } from "../domain/model.ts";
import { areaOf, browse, distanceTo, listingStatus, needsToday } from "../domain/selectors.ts";
import { daysUntil, POLICY } from "../domain/time.ts";
import {
  Avatar,
  Badge,
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
  const { data, mode, read, run, distance, setDistance, dialog } = useUI();
  const [text, setText] = useState(""),
    [open, setOpen] = useState(false);
  const [matches, setMatches] = useState<ViewData>();
  const navigate = useNavigate(),
    location = useLocation();
  useEffect(() => {
    setOpen(false);
  }, [location.pathname, location.search]);
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
        <div className="searchbox" id="searchbox">
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
              aria-label="Search listings"
              autoComplete="off"
              value={text}
              placeholder="Search sealed food near you…"
              onFocus={() => setOpen(true)}
              onChange={(event) => {
                setText(event.target.value);
                setOpen(true);
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape") setOpen(false);
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
                  Search “{text}”
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
                <h6>
                  Recent searches{" "}
                  <Button className="link" onClick={() => run("clearSearch", undefined)}>
                    Clear
                  </Button>
                </h6>
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
          <Button className="hbtn locbtn" act="loc" onClick={() => dialog(<AreaPicker />)}>
            <span className="lt">
              <small>Your area</small>
              <span id="locName">{areaOf(data).short}</span>
            </span>
          </Button>
          <select
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
          </select>
        </div>
      </div>
    </div>
  );
}

function AreaPicker() {
  const { run, close, notify } = useUI();
  const setArea = async (id: string) => {
    const result = await run("area", { id });
    if (result.ok) close();
    else notify(result.error.message);
  };
  return (
    <>
      <h3 id="m-title">Choose your area</h3>
      <p className="mute">Distances are estimates between sample neighbourhoods.</p>
      {navigator.geolocation && (
        <Button
          className="btn sec block"
          onClick={() => {
            navigator.geolocation.getCurrentPosition(
              ({ coords }) => {
                const byDistance = (loc: (typeof LOCATIONS)[number]) =>
                  Math.hypot(loc.ll[0] - coords.latitude, loc.ll[1] - coords.longitude);
                const closest = [...LOCATIONS].sort((a, b) => byDistance(a) - byDistance(b))[0];
                void setArea(closest.id);
              },
              () => notify("Couldn’t access your location. Choose an area."),
              { timeout: 8000, maximumAge: 600000 },
            );
          }}
        >
          Find the nearest area to me
        </Button>
      )}
      <div className="loclist">
        {LOCATIONS.map((area) => (
          <Button
            className="hbtn"
            key={area.id}
            act="setloc"
            data-id={area.id}
            onClick={() => setArea(area.id)}
          >
            <b>{area.short}</b>
            <small>{area.name}</small>
          </Button>
        ))}
      </div>
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
  const min = params.get("min") || "",
    max = params.get("max") || "",
    expiry = params.get("expiry") || "all";
  const dateType = params.get("dateType") || "all",
    collect = params.get("collect") || "all";
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
        (expiry === "all" || daysUntil(l.expiry, today) <= +expiry) &&
        (dateType === "all" || l.expiryType === dateType) &&
        (collect === "all" || daysUntil(l.pickupUntil, today) <= +collect),
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
  const actions = needsToday(data),
    first = actions[0];
  const noResults = (
    <Empty title="No listings match right now." text="Try another area or widen the distance.">
      <Button act="setdist" data-v="10" onClick={() => setDistance(10)}>
        Widen to ~10 km
      </Button>
      <Button act="setdist" data-v="all" className="btn sec" onClick={() => setDistance("all")}>
        Show all distances
      </Button>
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
        {first && (
          <section className="strip-act">
            <div className="wrap">
              <span className="kicker">Needs you today</span>
              <Link className={"sa " + first.tone} to={first.to}>
                <span>
                  <b>{first.title}</b>
                  <small>{first.detail}</small>
                </span>
              </Link>
              {actions.length > 1 && (
                <Link className="link sm" to="/dashboard">
                  +{actions.length - 1} more on Today
                </Link>
              )}
            </div>
          </section>
        )}
        <section className="hero compact">
          <div className="wrap hero-in">
            <div className="hero-t">
              <span className="eyebrow">Rescue · pickup marketplace</span>
              <h1>Sealed pantry food, collected near you.</h1>
              <p>
                Reserve online, collect in person, pay at pickup. {nearby.length} listings within{" "}
                {distance === "all" ? "any distance" : `~${distance} km`}.
              </p>
            </div>
          </div>
        </section>
        <section className="band">
          <div className="wrap">
            <div className="sec-h">
              <div>
                <h2>Near {areaOf(data).short}</h2>
                <p>Nearest first · distances are approximate</p>
              </div>
              <span className="sec-links">
                <Button
                  className="link"
                  act="seeall"
                  data-sort="collect"
                  onClick={() => setParams({ browse: "1", sort: "collect" })}
                >
                  Collect soonest first
                </Button>
                <Button className="link" act="seeall" onClick={() => setParams({ browse: "1" })}>
                  See all {nearby.length} listings →
                </Button>
              </span>
            </div>
            {nearby.length ? cards(nearby.slice(0, 8)) : noResults}
          </div>
        </section>
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
        <aside className={"filters" + (filters ? " open" : "")} id="filters" aria-label="Filters">
          <div className="fgrp fhead">
            <b>Filters</b>
            <Button className="link sm" act="freset" onClick={reset}>
              Reset filters
            </Button>
          </div>
          <div className="fgrp">
            <h4>Collect by</h4>
            {[
              ["0", "Today"],
              ["2", "Within 2 days"],
              ["all", "Any time"],
            ].map(([value, label]) => (
              <label key={value} className="rad">
                <input
                  type="radio"
                  name="collect"
                  checked={collect === value}
                  onChange={() => update("collect", value)}
                />
                {label}
              </label>
            ))}
          </div>
          <Disclosure title="More filters · date, price" className="flat">
            <label className="rad">
              Date type{" "}
              <select value={dateType} onChange={(event) => update("dateType", event.target.value)}>
                <option value="all">Any</option>
                <option value="best-before">Best before</option>
                <option value="use-by">Use by</option>
              </select>
            </label>
            <label className="rad">
              Date on pack{" "}
              <select value={expiry} onChange={(event) => update("expiry", event.target.value)}>
                <option value="all">Any</option>
                <option value="3">Within 3 days</option>
                <option value="7">Within 7 days</option>
              </select>
            </label>
            <div className="pricefields">
              <label>
                <span>Min</span>
                <input
                  type="number"
                  min={0}
                  data-f="min"
                  value={min}
                  onChange={(event) => update("min", event.target.value)}
                />
              </label>
              <label>
                <span>Max</span>
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
          </Disclosure>
          <Button className="btn mobile-only" onClick={() => setFilters(false)}>
            Show {results.length} results
          </Button>
        </aside>
        <div className={"scrim" + (filters ? " open" : "")} onClick={() => setFilters(false)} />
        <div id="results">
          <div className="toolbar">
            <b>
              {results.length} listings near {areaOf(data).short}
            </b>
            <Button className="btn sec sm filter-toggle" onClick={() => setFilters(true)}>
              Filters
            </Button>
            <label className="mute sm" htmlFor="sort">
              Sort by
            </label>
            <select
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
            </select>
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
  const imgs = listing.photos.length
    ? listing.photos
    : [0, 1, 2].map((crop) => photo(listing.kind, crop));
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
        submit={async () => {
          const result = await run("reserveListing", { id: listing.id, qty: count, requestId });
          if (result.ok) navigate("/reservation/" + result.value);
          return result;
        }}
      >
        <dl className="deflist tight">
          <dt>Total</dt>
          <dd>{rm(listing.price * count)} · paid in person</dd>
          <dt>Collect by</dt>
          <dd>{formatDeadline(listingCutoff(listing))}</dd>
        </dl>
        <p>
          The seller has two hours to respond. Once accepted you get a 4-digit pickup code. The
          price and pickup details are locked for this reservation.
        </p>
      </Confirm>,
    );
  }
  return (
    <>
      <div className="crumbs">
        <Link to="/market">Rescue</Link> › {catLabel(listing.cat)} › {listing.name}
      </div>
      <div className="detail">
        <div>
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
              {!listing.photos.length && <span className="illus lg">Illustrative photo</span>}
              <span className="gal-count">
                {(gallery % imgs.length) + 1} / {imgs.length}
              </span>
            </div>
            {imgs.length > 1 && (
              <div className="thumbs">
                {imgs.map((src, index) => (
                  <Button
                    className={index === gallery ? "on" : ""}
                    aria-label={"Image " + (index + 1)}
                    key={index}
                    onClick={() => setGallery(index)}
                  >
                    <Picture src={src} />
                  </Button>
                ))}
              </div>
            )}
          </div>
          <div className="box mt-4">
            <h3>Description</h3>
            <p>{listing.desc}</p>
          </div>
          <div className="box safety">
            <h3>Date, storage &amp; safety</h3>
            <p>
              {dateWord(listing.expiryType)} {formatDate(listing.expiry)}{" "}
              <Badge tone="y">Not verified</Badge>
            </p>
            <Note>
              FreshSave does not inspect, test or certify food. Check the seal, printed date, and
              allergen label at pickup.
            </Note>
          </div>
        </div>
        <div>
          <h1 className="d-title">{listing.name}</h1>
          <div className="d-price">
            <b>{rm(listing.price)}</b> <s>{rm(listing.orig)}</s>
          </div>
          <div className="facts">
            <div>
              <small>{dateWord(listing.expiryType)}</small>
              <b>{formatDate(listing.expiry)}</b>
            </div>
            <div>
              <small>Available</small>
              <b>{ledger.avail}</b>
            </div>
            <div>
              <small>Collect by</small>
              <b>{formatDeadline(listingCutoff(listing))}</b>
            </div>
          </div>
          {myRequests.map((record) => (
            <Note key={record.id}>
              You reserved {record.qty} ·{" "}
              <Link className="link" to={"/reservation/" + record.id}>
                View reservation
              </Link>
            </Note>
          ))}
          <div className="box">
            <h3>Reserve for pickup</h3>
            {own ? (
              <Note>
                This is your listing.{" "}
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
                      onClick={() => setQty(Math.max(1, count - 1))}
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
                      onClick={() => setQty(Math.min(ledger.avail, count + 1))}
                    >
                      +
                    </Button>
                  </div>
                </div>
                <dl className="deflist tight">
                  <dt>Collect by</dt>
                  <dd>
                    {formatDeadline(listingCutoff(listing))}
                    <br />
                    {formatTime(listing.pickFrom)}–{formatTime(listing.pickTo)} daily
                  </dd>
                  <dt>Pickup</dt>
                  <dd>
                    {seller?.name}
                    <br />
                    {seller?.area}
                  </dd>
                  <dt>Instructions</dt>
                  <dd>{listing.instr}</dd>
                </dl>
                <div className="total">
                  <span>Total · pay in person</span>
                  <b>{rm(listing.price * count)}</b>
                </div>
                {tooLate && (
                  <Note danger>The collection window closes too soon to reserve this.</Note>
                )}
                <Button
                  act="reserve"
                  className="btn block sage"
                  disabled={tooLate}
                  onClick={reserve}
                >
                  Reserve
                </Button>
              </>
            )}
          </div>
          {seller && (
            <div className="box">
              <h3>Seller</h3>
              <div className="seller">
                <Avatar name={seller.name} />
                <div>
                  <b>{seller.name}</b>
                  <br />
                  {seller.area}
                </div>
              </div>
              <div className="row-acts">
                <Link className="btn sec" to={"/seller/" + seller.id}>
                  Seller profile
                </Link>
                {mode === "demo" && !own && (
                  <Button className="btn sec" act="chat" onClick={chat}>
                    Message (simulated)
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
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
              onClick={() => {
                void run("openThread", { sellerId: store.id });
                navigate("?chat=" + store.id);
              }}
            >
              Message (simulated)
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
  const { data, run } = useUI(),
    navigate = useNavigate(),
    loc = useLocation();
  const threads = Object.values(data.threads || {}),
    thread = threads.find((t) => t.sellerId === sellerId);
  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget,
      text = String(new FormData(form).get("message") || "");
    if ((await run("sendMessage", { sellerId, text })).ok) form.reset();
  }
  return (
    <aside className="drawer open" aria-label="Messages (simulated)">
      <div className="dh">
        <div className="t">
          <b>{data.stores[sellerId]?.name || "Messages (simulated)"}</b>
          <small>Demo only</small>
        </div>
        <Button className="hbtn" aria-label="Close messages" onClick={close}>
          ×
        </Button>
      </div>
      <p className="simnote">
        Simulated chat. Messages stay in this browser and replies are automatic.
      </p>
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
                onClick={() => navigate(loc.pathname + "?chat=" + t.sellerId)}
              >
                {data.stores[t.sellerId]?.name}
              </Button>
            ))
          ) : (
            <p className="mute p-6">No conversations yet.</p>
          )}
        </div>
      )}
    </aside>
  );
}
