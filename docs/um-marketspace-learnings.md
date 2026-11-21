# What FreshSave learned from UM Marketspace

We reviewed the public marketplace in Chromium at desktop (1440 px), tablet (768 px), and phone (390 px) widths. We looked at Shop, category browsing, search results and empty states, a listing detail, the Requests feed, navigation menus, and the feedback dialog. Sell and Post a request led to sign-in, so those creation forms were outside the review. [UM Marketspace](https://ummarketspace.vercel.app/)

## What worked and how FreshSave applied it

| What we observed | Why it works | How FreshSave applied it |
| --- | --- | --- |
| Search, categories, and results follow a predictable order. The results heading leaves room for offers. | Shoppers can pick a direction and see results without passing through a separate promotional section. | Find Food uses a compact heading and one pickup explanation. The area, categories, and urgent pickup link remain available with less visual competition. |
| Product cards use consistent image proportions and predictable price placement. | Shoppers can compare names and prices across a row without relearning each card. | FreshSave aligns image crops and prices and gives the full printed date type and collection deadline space to wrap. Illustrative photos remain labelled. |
| The listing page groups the title, price, primary action, and meet-up information. Description and related offers follow. | Shoppers can find the information needed to decide before reading the background. | Product detail now leads with the name and price on phones. Printed date, pickup terms, quantity, availability, and food safety sit with Reserve. |
| The no-results screen gives shoppers a clear next step. Secondary links can sit in a menu. | An explicit action makes it easier to recover when a search turns up empty, and less-used actions compete less for attention. | FreshSave's Today screen uses labels such as **View pickup** and **Review past dates**. Stock and reservation screens keep the next action beside the relevant item and deadline, with secondary actions in their existing menus. |
| The feedback dialog keeps the field, helper text, and action together. | Users can see what they need to enter and where to submit it. | The listing wizard emphasizes the current step and gives its preview less visual weight. Manual entry and handover use more consistent spacing around fields and actions. |

## Where FreshSave needs a different approach

FreshSave needs more information on a card than a general marketplace does. A buyer must distinguish **Use by** from **Best before** and know whether pickup is possible. A retailer must be able to act on a stock count or handover without searching for it. The design keeps these facts visible, preserves mobile bottom navigation for Track and Rescue, and uses FreshSave’s coral and green palette. The comparison focused on layout and interaction principles. Reference artwork and screenshots stay in the local audit.

## What we verified

In the same seeded 390 × 844 px browser view, the bottom of the first offer’s price moved from about 1,000 px to 744 px, above the bottom navigation at 785 px. The browser checks also verified that the product title precedes the gallery on phones and that pickup and safety details appear before Reserve. These checks establish what is visible. How quickly first-time users understand the flow remains a usability research question.
