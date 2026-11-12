import { $, esc, ic, me, isRetailer, mySeller, myNotifs, ago } from "../core.js";

export function closePops(except) {
  ["#npop", "#mpop"].forEach(
    (selector) => selector !== except && $(selector).classList.remove("open"),
  );
}

const N_ICON = {
  expiry: "clock",
  expired: "alert",
  stock: "eye",
  resv: "receipt",
  collect: "check2",
};

export const actions = {
  npop: () => {
    const popover = $("#npop");
    if (popover.classList.contains("open")) return popover.classList.remove("open");
    closePops("#npop");
    const notifications = myNotifs()
      .sort((a, b) => b.at - a.at)
      .slice(0, 6);
    popover.innerHTML = `<div class="ph">Notifications <button class="link sm" data-act="readall">Mark all read</button></div>${notifications.map((n) => `<button class="pi ${n.unread ? "unread" : ""}" data-act="notif" data-id="${n.id}">${ic(N_ICON[n.type] || "bell", "sm")}<div><b>${esc(n.text)}</b><small>${esc(n.sub)}</small><small>${ago(n.at)}</small></div>${n.unread ? '<i class="udot"></i>' : ""}</button>`).join("") || '<div class="mute" style="padding:20px">No notifications</div>'}<a class="pf" href="#/notifications">View all notifications</a>`;
    popover.classList.add("open");
  },
  mpop: () => {
    const popover = $("#mpop");
    if (popover.classList.contains("open")) return popover.classList.remove("open");
    closePops("#mpop");
    const user = me(),
      retailer = isRetailer();
    popover.innerHTML = `<div class="ph col"><span>${esc(retailer ? mySeller().name : user.name)}</span><span class="mute sm">${esc(user.email)} · ${retailer ? "Retailer" : "Individual"}</span></div>
    ${[
      ["#/profile", "gear", "Profile & Settings"],
      ["#/notifications", "bell", "Notifications"],
      ["#/reservations", "receipt", retailer ? "Reservations" : "My Reservations"],
      ["#/dashboard", "home", "Dashboard"],
      ["#/impact", "chart", "Sustainability Impact"],
    ]
      .map(([href, icon, title]) => `<a class="pi" href="${href}">${ic(icon, "sm")}${title}</a>`)
      .join("")}
    <button class="pi sep" data-act="logout">${ic("logout", "sm")}Log out</button>`;
    popover.classList.add("open");
  },
};
