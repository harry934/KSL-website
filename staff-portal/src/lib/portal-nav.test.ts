import assert from "node:assert/strict";
import test from "node:test";
import type { ModuleKey, ModulePermission } from "./modules.ts";
import { permissionNavLinks, usesSidebar, type PortalAccess } from "./portal-nav.ts";

function access(keys: ModuleKey[], flags: Partial<ModulePermission> = {}): PortalAccess {
  return {
    isSuperAdmin: false,
    permissions: keys.map((module_key) => ({
      module_key,
      can_view: true,
      can_edit: false,
      can_publish: false,
      can_delete: false,
      ...flags,
    })),
  };
}

test("a sidebar is used only when there are more than six destinations", () => {
  const five = access(["news", "events", "gallery", "press", "services"]);
  assert.equal(permissionNavLinks(five).length, 6);
  assert.equal(usesSidebar(five), false);

  const six = access(["news", "events", "gallery", "press", "services", "products"]);
  assert.equal(permissionNavLinks(six).length, 7);
  assert.equal(usesSidebar(six), true);
});

test("site settings adds banner and website images", () => {
  const links = permissionNavLinks(access(["site_settings"]));
  assert.deepEqual(
    links.map((link) => link.label),
    ["Site settings", "Banner", "Website images"]
  );
  assert.equal(usesSidebar(access(["site_settings"])), false);
});

test("staff is not a sidebar item for an agent", () => {
  const links = permissionNavLinks(access(["staff", "news"]));
  assert.deepEqual(
    links.map((link) => link.href),
    ["/news", "/recycle"]
  );
});

test("an administrator always has a sidebar", () => {
  assert.equal(usesSidebar({ isSuperAdmin: true, permissions: [] }), true);
});
