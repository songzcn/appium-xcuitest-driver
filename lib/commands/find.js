import _ from 'lodash';
import { errors } from 'appium-base-driver';
import { util } from 'appium-support';
import log from '../logger';


let helpers = {}, commands = {}, extensions = {};

helpers.findElOrEls = async function (strategy, selector, mult, context) {
  if (this.isWebview()) {
    return await this.findWebElementOrElements(strategy, selector, mult, context);
  } else {
    return await this.findNativeElementOrElements(strategy, selector, mult, context);
  }
};

helpers.findNativeElementOrElements = async function (strategy, selector, mult, context) { // jshint ignore:line
  const initSelector = selector;
  let rewroteSelector = false;
  if (strategy === '-ios predicate string') {
    // WebDriverAgent uses 'predicate string'
    strategy = 'predicate string';
  }

  if (strategy === 'class name') {
    // XCUITest classes have `XCUIElementType` appended
    // first check if there is the old `UIA` prefix
    if (selector.indexOf('UIA') === 0) {
      selector = selector.substring(3);
    }
    // now check if we need to add `XCUIElementType`
    if (selector.indexOf('XCUIElementType') !== 0) {
      selector = `XCUIElementType${selector}`;
      rewroteSelector = true;
    }
  }

  if (strategy === 'xpath') {
    selector = selector.replace(/(UIA)([^\[\/]+)/g, (str, g1, g2) => {
      return `XCUIElementType${g2}`;
    });
    rewroteSelector = true;
  }

  if (rewroteSelector) {
    log.info(`Rewrote incoming selector from '${initSelector}' to ` +
             `'${selector}' to match XCUI type. You should consider ` +
             `updating your tests to use the new selectors directly`);
  }

  context = util.unwrapElement(context);

  let endpoint;
  /* jshint ignore:start */
  endpoint = `/element${context ? `/${context}/element` : ''}${mult ? 's' : ''}`;
  /* jshint ignore:end */

  let body = {
    using: strategy,
    value: selector
  };

  let method = 'POST';

  let els;
  try {
    await this.implicitWaitForCondition(async () => {
      try {
        els = await this.proxyCommand(endpoint, method, body);
        if (mult) {
          // we succeed if we get some elements
          return els && els.length;
        } else {
          // we may not get any status, which means success
          return !els.status || els.status === 0;
        }
      } catch (err) {
        els = undefined;
        return false;
      }
    });
  } catch (err) {
    if (err.message && err.message.match(/Condition unmet/)){
      // condition was not met setting res to empty array
      els = [];
    } else {
      throw err;
    }
  }
  if (mult) {
    return els;
  } else {
    if (!els || _.size(els) === 0) {
      throw new errors.NoSuchElementError();
    }
    return els;
  }
};


Object.assign(extensions, commands, helpers);
export { commands, helpers};
export default extensions;
