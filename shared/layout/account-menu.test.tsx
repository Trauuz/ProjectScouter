import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AccountMenuPanel } from "./account-menu";

describe("AccountMenuPanel", () => {
  it("shows Settings beside Help and keeps nested actions out of the root view", () => {
    const markup = renderToStaticMarkup(
      <AccountMenuPanel
        user={{
          id: "4ba19a1f-48bc-49eb-b9cc-9af80ac03b78",
          email: "scout@example.com",
          initials: "S",
        }}
        onSignOut={async () => ({ ok: true })}
        onDeleteAccount={async () => ({ ok: true })}
      />,
    );

    const rootView = markup.match(
      /<div class="account-menu__view" aria-label="Account options">([\s\S]*?)<\/div><\/div><dialog/,
    )?.[1];

    expect(rootView).toContain(">Settings<");
    expect(rootView).toContain(">Help<");
    expect(rootView).not.toContain(">Usage<");
    expect(rootView).not.toContain(">Delete account<");
    expect(markup).toContain(
      "Temporary failures are recorded and retried",
    );
  });
});
