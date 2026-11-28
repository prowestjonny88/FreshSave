import type {
  Activity,
  Batch,
  CatalogueItem,
  FoodInput,
  InventoryItem,
  Listing,
  ListingInput,
  Notification,
  Preferences,
  Reservation,
  Role,
  Session,
  StockUse,
  Store,
} from "../domain/model.ts";

export interface ViewQuery {
  page: string;
  id?: string;
  params?: URLSearchParams;
  search?: string;
  distance?: number | "all";
  offset?: number;
}

export interface ViewData {
  session: Session | null;
  inventory: InventoryItem[];
  inventoryTotal?: number;
  batches: Batch[];
  listings: Listing[];
  stores: Record<string, Store>;
  reservations: Reservation[];
  notifs: Notification[];
  notificationCounts?: { read: number; unread: number } | null;
  activity: Activity[];
  catalogue: CatalogueItem[];
  recent: string[];
  area?: string | null;
  more?: boolean;
  collectedFood?: Pick<InventoryItem, "id" | "status">;
  pageSize?: number;
  threads?: Record<
    string,
    {
      sellerId: string;
      listingId?: string | null;
      unread: number;
      msgs: { from: "me" | "them"; text: string; at: number }[];
    }
  >;
}

export const emptyView = (session: Session | null = null): ViewData => ({
  session,
  inventory: [],
  batches: [],
  listings: [],
  stores: {},
  reservations: [],
  notifs: [],
  activity: [],
  catalogue: [],
  recent: [],
});

interface Command<Input, Output = void> {
  input: Input;
  output: Output;
}
export interface Commands {
  login: Command<{ email: string; password: string; keep: boolean }, Session>;
  logout: Command<undefined>;
  register: Command<
    {
      name: string;
      email: string;
      password: string;
      role: Role;
      loc: string;
      store: string;
      address: string;
    },
    Session | null
  >;
  resetPassword: Command<{ email: string }>;
  changePassword: Command<{ current: string; password: string }>;
  profile: Command<{ name: string; email: string; loc: string; store: string; address: string }>;
  preferences: Command<Partial<Preferences>>;
  hideOnboarding: Command<undefined>;
  resetDemo: Command<undefined>;
  area: Command<{ id: string }>;
  recentSearch: Command<{ query: string }>;
  clearSearch: Command<undefined>;
  saveFood: Command<FoodInput & { id?: string; source?: string; reservationId?: string }, string>;
  useFood: Command<{ id: string; type: StockUse; qty: number }>;
  undoFood: Command<{ id: string }>;
  deleteFood: Command<{ id: string }>;
  saveBarcode: Command<{ barcode: string; name: string; cat: string }, CatalogueItem>;
  findBarcode: Command<{ barcode: string }, CatalogueItem | null>;
  dismissBatch: Command<{ id: string }>;
  recountBatch: Command<{ id: string }>;
  offerBatch: Command<ListingInput & { id?: string; countedExtra?: boolean }, string>;
  moveListing: Command<{ id: string }>;
  closeListing: Command<{ id: string; cancelOpen?: boolean }>;
  reserveListing: Command<{ id: string; qty: number; requestId: string }, string>;
  acceptReservation: Command<{ id: string }>;
  declineReservation: Command<{ id: string }>;
  cancelReservation: Command<{ id: string; reason?: string }>;
  completeHandover: Command<{
    id: string;
    code: string;
    item: boolean;
    paid: boolean;
    simulated?: boolean;
  }>;
  disputeReservation: Command<{ id: string }>;
  readNotification: Command<{ id?: string }>;
  clearReadNotifications: Command<undefined>;
  openThread: Command<{ sellerId: string; listingId?: string }>;
  sendMessage: Command<{ sellerId: string; text: string }>;
}

export type Failure = "invalid" | "forbidden" | "stale" | "stock" | "expired" | "connection";
export class RequestError extends Error {
  readonly code: Failure;
  readonly field?: string;

  constructor(code: Failure, message: string, field?: string) {
    super(message);
    this.code = code;
    this.field = field;
  }
}
export type Result<T> = { ok: true; value: T } | { ok: false; error: RequestError };
export const success = <T>(value: T): Result<T> => ({ ok: true, value });
export function invalid(message: string, field?: string): never {
  throw new RequestError("invalid", message, field);
}
export function forbidden(): never {
  throw new RequestError("forbidden", "This action is unavailable for your account.");
}

export interface Services {
  mode: "demo" | "supabase";
  read(query: ViewQuery): Promise<ViewData>;
  run<K extends keyof Commands>(
    name: K,
    input: Commands[K]["input"],
  ): Promise<Result<Commands[K]["output"]>>;
  subscribe(listener: () => void): () => void;
}

export type Handlers = {
  [K in keyof Commands]: (
    input: Commands[K]["input"],
  ) => Commands[K]["output"] | Promise<Commands[K]["output"]>;
};
