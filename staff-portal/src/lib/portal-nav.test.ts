import assert from "node:assert/strict";
import test from "node:test";
import type { ModuleKey, ModulePermission } from "./modules.ts";
import { validateUsername } from "./accounts.ts";
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
  const four = access(["news", "events", "gallery", "press"]);
  assert.equal(permissionNavLinks(four).length, 6);
  assert.equal(usesSidebar(four), false);

  const five = access(["news", "events", "gallery", "press", "services"]);
  assert.equal(permissionNavLinks(five).length, 7);
  assert.equal(usesSidebar(five), true);
});

test("every account can open its own audit log", () => {
  assert.deepEqual(
    permissionNavLinks(access([])).map((link) => link.href),
    ["/activity"]
  );
});

test("organisation access adds a Board destination", () => {
  const links = permissionNavLinks(access(["organization"]));
  assert.deepEqual(
    links.map((link) => link.href),
    ["/organization", "/board", "/recycle", "/activity"]
  );
});

test("site settings adds banner and website images", () => {
  const links = permissionNavLinks(access(["site_settings"]));
  assert.deepEqual(
    links.map((link) => link.label),
    ["Site settings", "Banner", "Website images", "Audit log"]
  );
  assert.equal(usesSidebar(access(["site_settings"])), false);
});

test("staff is not a sidebar item for an agent", () => {
  const links = permissionNavLinks(access(["staff", "news"]));
  assert.deepEqual(
    links.map((link) => link.href),
    ["/news", "/recycle", "/activity"]
  );
});

test("an administrator always has a sidebar", () => {
  assert.equal(usesSidebar({ isSuperAdmin: true, permissions: [] }), true);
});

test("publish rights add a Drafts destination", () => {
  const links = permissionNavLinks(access(["news"], { can_edit: true, can_publish: true }));
  assert.equal(links.some((link) => link.href === "/drafts"), true);
  assert.equal(permissionNavLinks(access(["news"])).some((link) => link.href === "/drafts"), false);
});

test("a username can be short and is refused after 10 characters", () => {
  assert.equal(validateUsername("a"), null);
  assert.equal(validateUsername("deniskyalo"), null);
  assert.equal(validateUsername("deniskyalo1"), "Use up to 10 characters: lowercase letters, numbers, dot, dash or underscore.");
  assert.equal(validateUsername(""), "Use up to 10 characters: lowercase letters, numbers, dot, dash or underscore.");
});
