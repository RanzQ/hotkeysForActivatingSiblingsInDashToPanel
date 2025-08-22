// After changes you must save then reload Gnome Shell
// Do this with Alt + F2 then r then Enter

import GLib from 'gi://GLib';
import Shell from 'gi://Shell';
import Meta from 'gi://Meta';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import {
  Extension,
  gettext as _,
} from 'resource:///org/gnome/shell/extensions/extension.js';

const GETTEXT_DOMAIN =
  'hotkeysForActivatingSiblingsInDashToPanel@tannerlegvold.gmail.com';

function wrapAround(index, length) {
  return ((index % length) + length) % length;
}

function getNextWindowIndex(currentIndex, windowCount, direction = 1) {
  let nextIndexCandidate = currentIndex + direction;
  return wrapAround(nextIndexCandidate, windowCount);
}

function getWindowsOfSameClass(windows, currentWindow) {
  return windows.filter(window => window.wm_class === currentWindow.wm_class);
}

function getMostRecentWindowByWMClass(windows, wmClass) {
  const matchingWindows = windows.filter(window => window.wm_class === wmClass);

  matchingWindows.sort((a, b) => b.get_user_time() - a.get_user_time());

  return matchingWindows.length > 0 ? matchingWindows[0] : null;
}

// Taken from https://github.com/home-sweet-gnome/dash-to-panel/blob/v68/src/utils.js#L432
// Changed the direction to left and right instead of up and down and added jumpToGroup
function activateSiblingWindow({
  windows: _windows,
  direction,
  startWindow,
  jumpToGroup,
  cycleGroup,
}) {
  const currentWindow = global.display.focus_window;

  let windows = _windows;

  if (!jumpToGroup && cycleGroup) {
    windows = getWindowsOfSameClass(windows, currentWindow);
  }

  const windowCount = windows.length;
  let windowIndex = windows.indexOf(currentWindow);
  let nextWindowIndex = windowIndex;
  const numericDirection = direction == 'left' ? -1 : 1;
  const startWindowIndex = startWindow ? windows.indexOf(startWindow) : 0;

  if (windowIndex < 0) {
    nextWindowIndex = startWindowIndex;
    if (windowIndex !== nextWindowIndex) {
      Main.activateWindow(windows[nextWindowIndex]);
    }
    return;
  }

  nextWindowIndex = getNextWindowIndex(
    windowIndex,
    windowCount,
    numericDirection
  );

  if (jumpToGroup) {
    let currentWmClass = currentWindow.wm_class;
    let candidateWindow = windows[nextWindowIndex];
    let candidateWmClass = candidateWindow.wm_class;
    let iterationsLeft = windowCount; // Prevent infinite loop

    // Loop until next group is found
    while (iterationsLeft > 0 && candidateWmClass === currentWmClass) {
      nextWindowIndex = getNextWindowIndex(
        nextWindowIndex,
        windowCount,
        numericDirection
      );

      candidateWindow = windows[nextWindowIndex];
      candidateWmClass = candidateWindow.wm_class;

      iterationsLeft--;
    }

    const nextWmClass = candidateWmClass;
    const nextWindow = getMostRecentWindowByWMClass(windows, nextWmClass);

    if (nextWindow) {
      Main.activateWindow(nextWindow);
      return;
    }
  }

  if (windowIndex !== nextWindowIndex) {
    Main.activateWindow(windows[nextWindowIndex]);
  }
}

function getWindows() {
  return global.dashToPanel.panels[0].taskbar
    .getAppInfos()
    .reduce((ws, appInfo) => ws.concat(appInfo.windows), []);
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
  Main.wm.addKeybinding(
    'dash-to-panel-activate-left',
    settings,
    flag,
    mode,
    () => {
      console.debug(_('%s: activate-left').format(GETTEXT_DOMAIN));
      let windows = getWindows();
      activateSiblingWindow({ windows, direction: 'left', cycleGroup: true });
    }
  );
  Main.wm.addKeybinding(
    'dash-to-panel-activate-right',
    settings,
    flag,
    mode,
    () => {
      console.debug(_('%s: activate-right').format(GETTEXT_DOMAIN));
      let windows = getWindows();
      activateSiblingWindow({ windows, direction: 'right', cycleGroup: true });
    }
  );
  Main.wm.addKeybinding(
    'dash-to-panel-activate-group-left',
    settings,
    flag,
    mode,
    () => {
      console.debug(_('%s: activate-group-left').format(GETTEXT_DOMAIN));
      let windows = getWindows();
      activateSiblingWindow({ windows, direction: 'left', jumpToGroup: true });
    }
  );
  Main.wm.addKeybinding(
    'dash-to-panel-activate-group-right',
    settings,
    flag,
    mode,
    () => {
      console.debug(_('%s: activate-group-right').format(GETTEXT_DOMAIN));
      let windows = getWindows();
      activateSiblingWindow({ windows, direction: 'right', jumpToGroup: true });
    }
  );

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
    Main.wm.removeKeybinding('dash-to-panel-activate-group-left');
    Main.wm.removeKeybinding('dash-to-panel-activate-group-right');
    this._settings = null;
  }
}
