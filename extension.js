// After changes you must save then reload Gnome Shell
// Do this with Alt + F2 then r then Enter

import GLib from 'gi://GLib';
import Shell from 'gi://Shell';
import Meta from 'gi://Meta';

import * as Main from 'resource:///org/gnome/shell/ui/main.js'

import {
  Extension,
  gettext as _,
} from 'resource:///org/gnome/shell/extensions/extension.js';

const GETTEXT_DOMAIN =
  'hotkeysForActivatingSiblingsInDashToPanel@tannerlegvold.gmail.com';

// Taken from https://github.com/home-sweet-gnome/dash-to-panel/blob/v68/src/utils.js#L432
// Changed the direction to left and right instead of up and down
function activateSiblingWindow(windows, direction, startWindow) {
  let windowIndex = windows.indexOf(global.display.focus_window);
  let nextWindowIndex =
    windowIndex < 0
      ? startWindow
        ? windows.indexOf(startWindow)
        : 0
      : windowIndex + (direction == 'left' ? -1 : 1);

  if (nextWindowIndex == windows.length) {
    nextWindowIndex = 0;
  } else if (nextWindowIndex < 0) {
    nextWindowIndex = windows.length - 1;
  }

  if (windowIndex != nextWindowIndex) {
    Main.activateWindow(windows[nextWindowIndex]);
  }
}

function waitForDashToPanelThenEnable(timeBetweenChecks, settings) {
  if (!global.dashToPanel) {
    console.debug(_('%s: still waiting').format(GETTEXT_DOMAIN));
    GLib.timeout_add(
      GLib.PRIORITY_DEFAULT,
      timeBetweenChecks,
      () => waitForDashToPanelThenEnable(timeBetweenChecks, settings)
    );
    return;
  }

  // See this for more on keybindings https://www.youtube.com/watch?v=L6ewpCMkrRE
  let mode = Shell.ActionMode.ALL;
  let flag = Meta.KeyBindingFlags.NONE;
  Main.wm.addKeybinding('activate-left', settings, flag, mode, () => {
    console.debug(_('%s: activate-left').format(GETTEXT_DOMAIN));
    let windows = global.dashToPanel.panels[0].taskbar
      .getAppInfos()
      .reduce((ws, appInfo) => ws.concat(appInfo.windows), []);
    activateSiblingWindow(windows, 'left');
  });
  Main.wm.addKeybinding('activate-right', settings, flag, mode, () => {
    console.debug(_('%s: activate-right').format(GETTEXT_DOMAIN));
    let windows = global.dashToPanel.panels[0].taskbar
      .getAppInfos()
      .reduce((ws, appInfo) => ws.concat(appInfo.windows), []);
    activateSiblingWindow(windows, 'right');
  });
  console.debug(_('%s: keys bound').format(GETTEXT_DOMAIN));
}

export default class HotkeysForActivatingSiblingsInDashToPanelExtension extends Extension {
  constructor(metadata) {
    super(metadata);
    this.initTranslations(GETTEXT_DOMAIN);
  }

  enable() {
    console.debug(_('Enabling %s').format(GETTEXT_DOMAIN));
    this._settings = this.getSettings();
    waitForDashToPanelThenEnable(1000, this._settings);
  }

  disable() {
    console.debug(_('Disabling %s').format(GETTEXT_DOMAIN));
    Main.wm.removeKeybinding('dash-to-panel-activate-left');
    Main.wm.removeKeybinding('dash-to-panel-activate-right');
    this._settings = null;
  }
}
