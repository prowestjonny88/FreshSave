import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { LOCATIONS } from "../data.js";
import { areaOf } from "../domain/selectors.ts";
import { Button } from "./primitives.tsx";
import { useUI } from "./state.tsx";

function searchableArea(value: string) {
  return value
    .toLowerCase()
    .replace(/\bkl\b/g, "kuala lumpur")
    .replace(/\bpj\b/g, "petaling jaya");
}

export function AreaSearch({
  inline = false,
  onBegin,
  onSelected,
}: {
  inline?: boolean;
  onBegin?: () => void;
  onSelected?: () => void;
}) {
  const { data, run, notify } = useUI();
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [highlighted, setHighlighted] = useState<string>();
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();
  const currentArea = areaOf(data);
  const showOptions = !inline || expanded;
  const terms = searchableArea(query).match(/[\p{L}\p{N}]+/gu) ?? [];
  const matches = LOCATIONS.filter((area) =>
    terms.every((term) => searchableArea(area.name).includes(term)),
  );
  const active = matches.findIndex((area) => area.id === highlighted);
  const optionId = (id: string) => listId + "-" + id;

  function dismiss() {
    setExpanded(false);
    setHighlighted(undefined);
    setQuery("");
  }

  useEffect(() => {
    if (!inline || !expanded) return;
    function outside(event: PointerEvent) {
      if (event.target instanceof Node && !root.current?.contains(event.target)) dismiss();
    }
    document.addEventListener("pointerdown", outside, true);
    return () => document.removeEventListener("pointerdown", outside, true);
  }, [inline, expanded]);

  useLayoutEffect(() => {
    if (inline && !expanded && document.activeElement === input.current) input.current?.select();
  }, [inline, expanded, currentArea.short]);

  function open() {
    if (!inline || expanded) return;
    onBegin?.();
    setExpanded(true);
  }

  async function choose(id: string) {
    const result = await run("area", { id });
    if (!result.ok) {
      notify(result.error.message);
      return;
    }
    dismiss();
    onSelected?.();
  }

  function handleKey(event: KeyboardEvent<HTMLInputElement>) {
    if (event.nativeEvent.isComposing) return;
    if (event.key === "Escape" && inline && expanded) {
      event.preventDefault();
      dismiss();
    }
    if (event.key === "Enter" && showOptions) {
      event.preventDefault();
      const choice = matches[active] ?? (matches.length === 1 ? matches[0] : undefined);
      if (choice) void choose(choice.id);
    }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    open();
    if (!matches.length) return;
    const next =
      event.key === "ArrowDown"
        ? (active + 1) % matches.length
        : (active <= 0 ? matches.length : active) - 1;
    setHighlighted(matches[next].id);
  }

  useEffect(() => {
    if (!highlighted) return;
    document.getElementById(listId + "-" + highlighted)?.scrollIntoView({ block: "nearest" });
  }, [highlighted, listId]);

  return (
    <div
      className={inline ? "area-search area-search-inline" : "area-search"}
      ref={root}
      onBlur={(event) => {
        if (inline && !event.currentTarget.contains(event.relatedTarget)) dismiss();
      }}
    >
      <label className="area-search-field">
        <span>{inline ? "Your area" : "City or neighbourhood"}</span>
        <input
          ref={input}
          id={inline ? "market-area" : undefined}
          role="combobox"
          aria-autocomplete="list"
          aria-controls={showOptions ? listId : undefined}
          aria-expanded={showOptions}
          aria-activedescendant={active >= 0 ? optionId(matches[active].id) : undefined}
          autoComplete="off"
          placeholder="Search city or area"
          value={showOptions ? query : currentArea.short}
          onFocus={open}
          onClick={open}
          onChange={(event) => {
            open();
            setQuery(event.target.value);
            setHighlighted(undefined);
          }}
          onKeyDown={handleKey}
        />
      </label>
      {showOptions && (
        <div className="area-suggestions">
          <div className="area-options" id={listId} role="listbox" aria-label="Areas">
            {matches.map((area) => (
              <Button
                key={area.id}
                id={optionId(area.id)}
                role="option"
                tabIndex={-1}
                className={area.id === highlighted ? "area-option highlighted" : "area-option"}
                act="setloc"
                data-id={area.id}
                aria-selected={area.id === currentArea.id}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => void choose(area.id)}
              >
                {area.name}
              </Button>
            ))}
          </div>
          {!matches.length && (
            <p className="mute" role="status">
              No matching areas. Try a nearby neighbourhood.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
