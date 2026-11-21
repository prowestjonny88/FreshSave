import { createClient } from "@supabase/supabase-js";
import { LOCATIONS } from "../data.js";
import type { CatalogueItem, Session } from "../domain/model.ts";
import {
  emptyView,
  invalid,
  RequestError,
  success,
  type Commands,
  type Failure,
  type Result,
  type Services,
  type ViewData,
  type ViewQuery,
} from "./contracts.ts";

const codes: Record<string, Failure> = {
  FS001: "invalid",
  FS002: "forbidden",
  FS003: "stale",
  FS004: "stock",
  FS005: "expired",
  "42501": "forbidden",
  "23514": "invalid",
  "23505": "stale",
  "22P02": "invalid",
};
function translate(error: unknown): RequestError {
  if (error instanceof RequestError) return error;
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    const found = "code" in error && typeof error.code === "string" ? codes[error.code] : undefined;
    const status = "status" in error ? error.status : undefined;
    const code =
      found ||
      (status === 401 || status === 403
        ? "forbidden"
        : status === 400 || status === 422
          ? "invalid"
          : "connection");
    const field =
      "details" in error && typeof error.details === "string" && /^[A-Za-z]+$/.test(error.details)
        ? error.details
        : undefined;
    return new RequestError(
      code,
      code === "connection"
        ? "Could not reach local Supabase. Check that the local stack is running and retry."
        : error.message,
      field,
    );
  }
  return new RequestError(
    "connection",
    "Could not reach local Supabase. Check that the local stack is running and retry.",
  );
}

export async function createSupabaseServices(url: string, key: string): Promise<Services> {
  if (!url || !key || key.startsWith("sb_secret_"))
    throw new Error(
      "Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY for the local Supabase instance.",
    );
  const target = new URL(url);
  if (!["localhost", "127.0.0.1", "[::1]"].includes(target.hostname))
    throw new Error("FreshSave Supabase mode requires a local API URL.");
  let keep = !sessionStorage.getItem("freshsave-shared-tab");
  const sessionStorageAdapter = {
    getItem: (name: string) => sessionStorage.getItem(name) ?? localStorage.getItem(name),
    setItem: (name: string, value: string) => {
      const write = keep ? localStorage : sessionStorage;
      const other = keep ? sessionStorage : localStorage;
      write.setItem(name, value);
      other.removeItem(name);
    },
    removeItem: (name: string) => {
      sessionStorage.removeItem(name);
      localStorage.removeItem(name);
    },
  };
  const client = createClient(target.href, key, {
    auth: {
      flowType: "pkce",
      detectSessionInUrl: false,
      storage: sessionStorageAdapter,
      storageKey: "freshsave-shared-auth",
    },
  });
  const listeners = new Set<() => void>();
  const changed = () => listeners.forEach((listener) => listener());
  let recovery = false;
  const params = new URLSearchParams(location.search),
    code = params.get("code");
  if (code) {
    const result = await client.auth.exchangeCodeForSession(code);
    if (result.error) throw new Error("The password reset link is invalid or expired.");
    recovery = true;
    params.delete("code");
    history.replaceState(
      null,
      "",
      location.pathname + (params.size ? "?" + params : "") + "#/recover",
    );
  }
  client.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_OUT" || event === "TOKEN_REFRESHED") queueMicrotask(changed);
  });
  let area: string | null = null;
  let recent: string[] = [];
  const pathByUrl = new Map<string, string>();
  const signedByPath = new Map<string, { url: string; expires: number }>();
  const bucket = client.storage.from("food-photos");

  async function rpc(action: string, input: unknown) {
    const { data, error } = await client.rpc("freshsave_command", { action, input: input ?? {} });
    if (error) throw error;
    if (data && typeof data === "object" && "error" in data)
      throw new RequestError(data.error as Failure, String(data.message));
    return data;
  }

  async function view(query: ViewQuery): Promise<ViewData> {
    const auth = await client.auth.getSession();
    if (auth.error) throw auth.error;
    if (!auth.data.session) return emptyView();
    const { data, error } = await client.rpc("freshsave_view", {
      page: query.page,
      options: {
        id: query.id,
        from: query.params?.get("from"),
        search: query.search,
        cat: query.params?.get("cat"),
        distance: query.page === "seller" ? "all" : query.distance,
        min: query.params?.get("min"),
        max: query.params?.get("max"),
        expiry: query.params?.get("expiry"),
        collect: query.params?.get("collect"),
        dateType: query.params?.get("dateType"),
        sort: query.params?.get("sort"),
        offset: Math.min(100_000, Math.max(0, Math.trunc(query.offset || 0))),
        area,
      },
    });
    if (error) throw error;
    return { ...emptyView(), ...(data as Partial<ViewData>), recent };
  }

  async function loadedSession(): Promise<Session> {
    const data = await view({ page: "login" });
    if (!data.session)
      throw new RequestError(
        "invalid",
        "This account has no FreshSave profile. Register through FreshSave or reset the local fixtures.",
      );
    return data.session;
  }

  async function signedPhoto(path?: string | null): Promise<string | undefined> {
    if (!path) return undefined;
    const cached = signedByPath.get(path);
    if (cached && cached.expires > Date.now()) return cached.url;
    const { data } = await bucket.createSignedUrl(path, 900);
    if (!data) return undefined;
    pathByUrl.set(data.signedUrl, path);
    signedByPath.set(path, { url: data.signedUrl, expires: Date.now() + 840_000 });
    return data.signedUrl;
  }
  async function uploadPhoto(value: string, uploaded: string[]) {
    const existing = pathByUrl.get(value);
    if (existing) return existing;
    if (!value.startsWith("data:image/jpeg;")) invalid("Choose a local product photo.");
    const { data, error } = await client.auth.getUser();
    if (error || !data.user)
      throw error || new RequestError("forbidden", "Sign in to upload photos.");
    const path = data.user.id + "/" + crypto.randomUUID() + ".jpg";
    const blob = await (await fetch(value)).blob();
    const upload = await bucket.upload(path, blob, { contentType: "image/jpeg" });
    if (upload.error) throw upload.error;
    uploaded.push(path);
    return path;
  }

  async function command<K extends keyof Commands>(name: K, input: Commands[K]["input"]) {
    const uploaded: string[] = [];
    try {
      switch (name) {
        case "login": {
          const fields = input as Commands["login"]["input"];
          keep = fields.keep;
          if (keep) sessionStorage.removeItem("freshsave-shared-tab");
          else sessionStorage.setItem("freshsave-shared-tab", "1");
          const { error } = await client.auth.signInWithPassword({
            email: fields.email.trim().toLowerCase(),
            password: fields.password,
          });
          if (error) throw error;
          area = null;
          return await loadedSession();
        }
        case "logout": {
          const { error } = await client.auth.signOut({ scope: "local" });
          if (error) throw error;
          sessionStorage.removeItem("freshsave-shared-tab");
          area = null;
          recent = [];
          return undefined;
        }
        case "register": {
          const fields = input as Commands["register"]["input"];
          if (
            fields.name.trim().length < 2 ||
            fields.password.length < 8 ||
            !LOCATIONS.some((location) => location.id === fields.loc)
          )
            invalid("Enter a name, an area and a password with at least 8 characters.");
          if (
            fields.role === "retailer" &&
            (fields.store.trim().length < 2 || fields.address.trim().length < 8)
          )
            invalid("Enter the store name and full pickup address.");
          keep = true;
          sessionStorage.removeItem("freshsave-shared-tab");
          const { data, error } = await client.auth.signUp({
            email: fields.email.trim().toLowerCase(),
            password: fields.password,
          });
          if (error) throw error;
          if (!data.session)
            invalid(
              "Sign up could not start a local session. Use a new test email and check local Auth settings.",
            );
          await rpc("setupProfile", {
            name: fields.name,
            role: fields.role,
            loc: fields.loc,
            store: fields.store,
            address: fields.address,
          });
          return await loadedSession();
        }
        case "changePassword": {
          const fields = input as Commands["changePassword"]["input"];
          if (fields.password.length < 8) invalid("Use at least 8 characters.");
          if (!recovery) {
            const current = await loadedSession();
            const check = await client.auth.signInWithPassword({
              email: current.user.email,
              password: fields.current,
            });
            if (check.error) throw check.error;
          }
          const { error } = await client.auth.updateUser({ password: fields.password });
          if (error) throw error;
          recovery = false;
          return undefined;
        }
        case "resetPassword": {
          const { email } = input as Commands["resetPassword"]["input"];
          const { error } = await client.auth.resetPasswordForEmail(email, {
            redirectTo: location.origin + location.pathname,
          });
          if (error) throw error;
          return undefined;
        }
        case "profile": {
          const fields = input as Commands["profile"]["input"];
          const current = await loadedSession();
          await rpc(name, {
            name: fields.name,
            loc: fields.loc,
            store: fields.store,
            address: fields.address,
          });
          if (fields.email.trim().toLowerCase() !== current.user.email) {
            const { error } = await client.auth.updateUser({
              email: fields.email.trim().toLowerCase(),
            });
            if (error) throw error;
          }
          area = null;
          return undefined;
        }
        case "area": {
          const { id } = input as Commands["area"]["input"];
          if (!LOCATIONS.some((location) => location.id === id)) invalid("Choose an area.");
          area = id;
          return undefined;
        }
        case "recentSearch": {
          const { query } = input as Commands["recentSearch"]["input"];
          if (query.trim())
            recent = [
              query,
              ...recent.filter((entry) => entry.toLowerCase() !== query.toLowerCase()),
            ].slice(0, 6);
          return undefined;
        }
        case "clearSearch":
          recent = [];
          return undefined;
        case "findBarcode": {
          const { barcode } = input as Commands["findBarcode"]["input"];
          const { data, error } = await client
            .from("catalogue")
            .select("barcode,name,category,kind,owner")
            .eq("barcode", barcode)
            .limit(2);
          if (error) throw error;
          const record = data.find((row) => row.owner) || data[0];
          const item: CatalogueItem | null = record
            ? {
                barcode: record.barcode,
                name: record.name,
                cat: record.category,
                kind: record.kind,
                src: record.owner ? "user" : "catalogue",
              }
            : null;
          return item;
        }
        case "saveFood": {
          const food = input as Commands["saveFood"]["input"];
          const photo = food.photo ? await uploadPhoto(food.photo, uploaded) : undefined;
          return await rpc(name, { ...food, photo });
        }
        case "offerBatch": {
          const listing = input as Commands["offerBatch"]["input"];
          const photos: string[] = [];
          for (const src of listing.photos) photos.push(await uploadPhoto(src, uploaded));
          return await rpc(name, { ...listing, photos });
        }
        case "resetDemo":
        case "openThread":
        case "sendMessage":
          throw new RequestError("forbidden", "This action is available in standalone demo mode.");
        default:
          return await rpc(name, input);
      }
    } catch (error) {
      if (uploaded.length) await bucket.remove(uploaded).catch(() => undefined);
      throw error;
    }
  }

  return {
    mode: "supabase",
    async read(query) {
      try {
        const data = await view(query);
        const [listings, inventory, batches] = await Promise.all([
          Promise.all(
            data.listings.map(async (item) => ({
              ...item,
              photos: (await Promise.all(item.photos.map(signedPhoto))).filter(
                (value): value is string => !!value,
              ),
            })),
          ),
          Promise.all(
            data.inventory.map(async (item) => ({ ...item, photo: await signedPhoto(item.photo) })),
          ),
          Promise.all(
            data.batches.map(async (item) => ({ ...item, photo: await signedPhoto(item.photo) })),
          ),
        ]);
        return { ...data, listings, inventory, batches };
      } catch (error) {
        throw translate(error);
      }
    },
    async run<K extends keyof Commands>(
      name: K,
      input: Commands[K]["input"],
    ): Promise<Result<Commands[K]["output"]>> {
      try {
        const value = (await command(name, input)) as Commands[K]["output"];
        if (name !== "findBarcode" && name !== "resetPassword") changed();
        return success(value);
      } catch (error) {
        const failure = translate(error);
        if (failure.code === "expired" || failure.code === "stock" || failure.code === "stale")
          changed();
        return { ok: false, error: failure };
      }
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
