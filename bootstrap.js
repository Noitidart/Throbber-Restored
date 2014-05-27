const {interfaces: Ci, utils: Cu, classes: Cc} = Components;
const self = {
	name: 'Throbber Restored',
	path: {
		chrome: 'chrome://throbber-restored/content/'
	},
	aData: 0,
};
const myServices = {};
var cssUri;
var cssUri_CustomImgIdle;
var cssUri_CustomImgLoading;

Cu.import('resource://gre/modules/Services.jsm');
Cu.import('resource:///modules/CustomizableUI.jsm');
Cu.import('resource://gre/modules/devtools/Console.jsm');
Cu.import('resource://gre/modules/XPCOMUtils.jsm');
Cu.import('resource://gre/modules/osfile.jsm');
Cu.import('resource://gre/modules/FileUtils.jsm');

XPCOMUtils.defineLazyGetter(myServices, 'sss', function(){ return Cc['@mozilla.org/content/style-sheet-service;1'].getService(Ci.nsIStyleSheetService) });

var workers = [];

const gMutationConfig = {attributes:true, attributeOldValue:true};

function winWorker(aDOMWindow) {
	this.DOMWindow = aDOMWindow;
	this.DOMDocument = this.DOMWindow.document;
	this.gBrowser = this.DOMWindow.gBrowser;
	this.gThrobber = this.DOMDocument.getElementById('navigator-throbber');
	
	
	this.gMutationFunc = function(ms) {
		for(let m of ms) {
			if(m.attributeName == 'busy') {
				console.log('m.attributeName = ', m.attributeName, 'm.oldValue = ', m.oldValue);
				if (m.oldValue == 'true') { //if m.oldValue == null then it did not exist before
					this.gThrobber.removeAttribute('loading');
				} else {
					this.gThrobber.setAttribute('loading', 'true');
				}
				break;
			}
		}
	};
	
	this.gMutationObserver = new this.DOMWindow.MutationObserver(this.gMutationFunc.bind(this));
	
	if (!this.gBrowser) {
		console.error('this window does not have gBrowser');
	}
	if (!this.gThrobber) {
		console.error('this window does not have gThrobber');
	}
	if (!this.gBrowser.tabContainer) {
		console.warn('this window does not have tabContainer, but just an exception/warning NOT an error');
	}
	
	this.onTabSelect = function(e) {
		console.log('tab seld yaaa ' + new Date().getTime());
		this.gMutationObserver.disconnect();
		var tab = e.target;
		//var throbber = tab.ownerDocument.getAnonymousElementByAttribute(tab, 'class', 'tab-throbber')
		this.gMutationObserver.observe(tab, gMutationConfig);
		
		if (tab.hasAttribute('busy')) {
			this.gThrobber.setAttribute('loading', 'true');
		} else {
			this.gThrobber.removeAttribute('loading');
		}
	};
	
	this.onTabSelectBinded = this.onTabSelect.bind(this);
	
	this.init = function() {
		this.gBrowser.tabContainer.addEventListener('TabSelect', this.onTabSelectBinded, false);
		var tab = this.gBrowser.selectedTab;
		//var throbber = tab.ownerDocument.getAnonymousElementByAttribute(tab, 'class', 'tab-throbber');
		this.gMutationObserver.observe(tab, gMutationConfig);
		
		// var gThrobberIcon = this.gThrobber.ownerDocument.getAnonymousElementByAttribute(this.gThrobber, 'class', 'toolbarbutton-icon');
		// gThrobberIcon.removeAttribute('class');
	};
	
	this.destroy = function() {
		this.gMutationObserver.disconnect();
		this.gBrowser.tabContainer.removeEventListener('TabSelect', this.onTabSelectBinded, false);
	};
}

var observers = {
	inlineOptsDispd: {
		observe: function (aSubject, aTopic, aData) {
			console.log('incoming inlineOptsDispd: aSubject = ' + aSubject + ' | aTopic = ' + aTopic + ' | aData = ' + aData);
			if (aData == self.aData.id) {
				console.log('IS THROBBER RESTORED');
				var doc = aSubject;
				var custImgIdle = doc.querySelector('setting[pref="extensions.ThrobberRestored.customImgIdle"]');
				var custImgLoading = doc.querySelector('setting[pref="extensions.ThrobberRestored.customImgLoading"]');
				
				var props = {
					id: 'btn_resetCustImgIdle',
					label: 'Restore Default'
				};
				var preExEl = doc.querySelector('#' + props.id);
				if (preExEl) { //label is already there so continue, so remove it then we'll add again
					preExEl.parentNode.removeChild(preExEl);
				}
				var el = doc.createElementNS('http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul', 'button');
				el.addEventListener('command', function() {
					prefs.customImgIdle.setval('');
				}, false);
				for (var p in props) {
					el.setAttribute(p, props[p]);
				}
				var browseBtn = doc.getAnonymousElementByAttribute(custImgIdle, 'anonid', 'button');
				browseBtn.parentNode.insertBefore(el, browseBtn);

				
				
				//add loading reste button
				var props = {
					id: 'btn_resetCustImgLoading',
					label: 'Restore Default'
				};
				var preExEl = doc.querySelector('#' + props.id);
				if (preExEl) { //label is already there so continue, so remove it then we'll add again
					preExEl.parentNode.removeChild(preExEl);
				}
				var el = doc.createElementNS('http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul', 'button');
				el.addEventListener('command', function() {
					prefs.customImgLoading.setval('');
				}, false);
				for (var p in props) {
					el.setAttribute(p, props[p]);
				}
				var browseBtn = doc.getAnonymousElementByAttribute(custImgLoading, 'anonid', 'button');
				browseBtn.parentNode.insertBefore(el, browseBtn);
			}
		},
		reg: function () {
			Services.obs.addObserver(observers.inlineOptsDispd, 'addon-options-displayed', false);
		},
		unreg: function () {
			Services.obs.removeObserver(observers.inlineOptsDispd, 'addon-options-displayed');
		}
	},
	inlineOptsHid: {
		observe: function (aSubject, aTopic, aData) {
			console.log('incoming inlineOptsHid: aSubject = ' + aSubject + ' | aTopic = ' + aTopic + ' | aData = ' + aData);
			if (aData == self.aData.id) {
				console.log('IS THROBBER RESTORED');
				//addonMgrXulWin = null; //trial as of 112713
			}
		},
		reg: function () {
			Services.obs.addObserver(observers.inlineOptsHid, 'addon-options-hidden', false);
		},
		unreg: function () {
			Services.obs.removeObserver(observers.inlineOptsHid, 'addon-options-hidden');
		}
	}
};

/*start - windowlistener*/
var windowListener = {
	//DO NOT EDIT HERE
	onOpenWindow: function (aXULWindow) {
		// Wait for the window to finish loading
		let aDOMWindow = aXULWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowInternal || Ci.nsIDOMWindow);
		aDOMWindow.addEventListener('load', function () {
			aDOMWindow.removeEventListener('load', arguments.callee, false);
			windowListener.loadIntoWindow(aDOMWindow, aXULWindow);
		}, false);
	},
	onCloseWindow: function (aXULWindow) {},
	onWindowTitleChange: function (aXULWindow, aNewTitle) {},
	register: function () {
		// Load into any existing windows
		let XULWindows = Services.wm.getXULWindowEnumerator(null);
		while (XULWindows.hasMoreElements()) {
			let aXULWindow = XULWindows.getNext();
			let aDOMWindow = aXULWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowInternal || Ci.nsIDOMWindow);
			windowListener.loadIntoWindow(aDOMWindow, aXULWindow);
		}
		// Listen to new windows
		Services.wm.addListener(windowListener);
	},
	unregister: function () {
		// Unload from any existing windows
		let XULWindows = Services.wm.getXULWindowEnumerator(null);
		while (XULWindows.hasMoreElements()) {
			let aXULWindow = XULWindows.getNext();
			let aDOMWindow = aXULWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowInternal || Ci.nsIDOMWindow);
			windowListener.unloadFromWindow(aDOMWindow, aXULWindow);
		}
		//Stop listening so future added windows dont get this attached
		Services.wm.removeListener(windowListener);
		
		[].forEach.call(workers, function(worker, i) {
			//need to check if worker.DOMWindow is open BUT for now im just doing try catch
			try {
				worker.destroy();
			} catch(ex) {
				console.warn('exception while destroying worker i = ',  i, 'ex = ', ex);
			}
			console.log('done destorying worker i = ',  i);
		});
	},
	//END - DO NOT EDIT HERE
	loadIntoWindow: function (aDOMWindow, aXULWindow) {
		if (!aDOMWindow) {
			return;
		}
		
		/* var throbber = aDOMWindow.document.getElementById('navigator-throbber');
		if (throbber) {
			
		} */
		
		if (aDOMWindow.gBrowser && aDOMWindow.gBrowser.tabContainer) {
			//aDOMWindow.gBrowser.tabContainer.addEventListener("TabSelect", tabSelected, false);
			var worker = new winWorker(aDOMWindow);
			worker.init();
			workers.push(worker);
		}
		
	},
	unloadFromWindow: function (aDOMWindow, aXULWindow) {
		if (!aDOMWindow) {
			return;
		}
		
		// if (aDOMWindow.gBrowser && aDOMWindow.gBrowser.tabContainer) {
			// aDOMWindow.gBrowser.tabContainer.removeEventListener("TabSelect", tabSelected, false);
		// }
	}
};
/*end - windowlistener*/
function startup(aData, aReason) {
	
	self.aData = aData; //must go first, because functions in loadIntoWindow use self.aData
	
	//start pref stuff more
	console.log('aReason=', aReason);
	//must forceCallbacks on startup, as the callbacks will read the inital prefs
	if ([ADDON_INSTALL,ADDON_UPGRADE,ADDON_DOWNGRADE].indexOf(aReason) > -1) {
		console.log('setting defaults logical if');
		myPrefListener.register(true, true); //true so it triggers the callback on registration, which sets value to current value //myPrefListener.setDefaults(); //in jetpack they get initialized somehow on install so no need for this	//on startup prefs must be initialized first thing, otherwise there is a chance that an added event listener gets called before settings are initalized
		//setDefaults safe to run after install too though because it wont change the current pref value if it is changed from the default.
		//good idea to always call setDefaults before register, especially if true for tirgger as if the prefs are not there the value in we are forcing it to use default value which is fine, but you know what i mean its not how i designed it, use of default is a backup plan for when something happens (like maybe pref removed)
	} else {
		myPrefListener.register(false, true); //true so it triggers the callback on registration, which sets value to current value
	}
	//end pref stuff more
	
	//register all observers
	for (var o in observers) {
		observers[o].reg();
	}
	
	CustomizableUI.createWidget({ //must run createWidget before windowListener.register because the register function needs the button added first
		id : 'navigator-throbber',
		defaultArea : CustomizableUI.AREA_NAVBAR,
		label : 'Loading',
		overflows: false
	});
	
	var newURIParam = {
		aURL: self.path.chrome + 'toolbarbutton.css',
		aOriginCharset: null,
		aBaseURI: null
	}
	cssUri = Services.io.newURI(newURIParam.aURL, newURIParam.aOriginCharset, newURIParam.aBaseURI);
	console.log('aURL=', self.path.chrome + 'toolbarbutton.css');
	console.log('cssUri=', cssUri);
	
	windowListener.register();
	
	myServices.sss.loadAndRegisterSheet(cssUri, myServices.sss.USER_SHEET); //running this last as i think its syncronus
	console.log('here');
}

function shutdown(aData, aReason) {
	if (aReason == APP_SHUTDOWN) return;
	
	console.log('s0');
	windowListener.unregister();
	console.log('s1');
	CustomizableUI.destroyWidget('navigator-throbber');
	console.log('s2');
	myServices.sss.unregisterSheet(cssUri, myServices.sss.USER_SHEET); //running htis last as i think its syncronus
	console.log('s3');
	
	if (cssUri_CustomImgIdle) {
		console.log('s4');
		myServices.sss.unregisterSheet(cssUri_CustomImgIdle, myServices.sss.USER_SHEET); //running htis last as i think its syncronus
		console.log('s5');
	}
	
	if (cssUri_CustomImgLoading) {
		console.log('s6');
		myServices.sss.unregisterSheet(cssUri_CustomImgLoading, myServices.sss.USER_SHEET); //running htis last as i think its syncronus
		console.log('s7');
	}
	
	console.log('s8');
	//unregister all observers
	for (var o in observers) {
		observers[o].unreg();
	}
	console.log('s9');
	
	//start pref stuff more
	myPrefListener.unregister();
	//end pref stuff more
	console.log('s10');
}

function install(aData, aReason) {}

function uninstall(aData, aReason) {
	if (aReason == ADDON_UNINSTALL) { //have to put this here because uninstall fires on upgrade/downgrade too
		//this is real uninstall
		Services.prefs.deleteBranch(prefPrefix);
	}
}


//start pref stuff
const prefPrefix = 'extensions.ThrobberRestored.'; //cannot put this in startup and cannot use self.aData.id
var prefs = { //each key here must match the exact name the pref is saved in the about:config database (without the prefix)
	customImgIdle: {
		default: '',
		value: null,
		type: 'Char',
		onChange: function(oldVal, newVal, refObj) {
			if (oldVal && oldVal != '') {
				myServices.sss.unregisterSheet(cssUri_CustomImgIdle, myServices.sss.USER_SHEET);
			}
			newVal = newVal.trim();
			if (newVal == '') {
				cssUri_CustomImgIdle = '';
			} else {
				var normalized = OS.Path.normalize(newVal);
				var file = new FileUtils.File(normalized);
				var fileuri = Services.io.newFileURI(file).spec;
				console.log('fileuri', fileuri);
				//var newuri = Services.io.newURI(newVal, null, null);
				//var newValRep = 'file:///' + newuri.spec.replace(/\\/g, '/');
				
 				var css = '#navigator-throbber:not([loading]) { list-style-image: url("' + fileuri + '") !important; }';
				var newURIParam = {
					aURL: 'data:text/css,' + encodeURIComponent(css),
					aOriginCharset: null,
					aBaseURI: null
				};
				cssUri_CustomImgIdle = Services.io.newURI(newURIParam.aURL, newURIParam.aOriginCharset, newURIParam.aBaseURI);
				myServices.sss.loadAndRegisterSheet(cssUri_CustomImgIdle, myServices.sss.USER_SHEET); //running this last as i think its syncronus
			}
		}
	},
	customImgLoading: {
		default: '',
		value: null,
		type: 'Char',
		onChange: function(oldVal, newVal, refObj) {
			if (oldVal && oldVal != '') {
				myServices.sss.unregisterSheet(cssUri_CustomImgLoading, myServices.sss.USER_SHEET);
			}
			newVal = newVal.trim();
			if (newVal == '') {
				cssUri_CustomImgLoading = '';
			} else {
				var normalized = OS.Path.normalize(newVal);
				var file = new FileUtils.File(normalized);
				var fileuri = Services.io.newFileURI(file).spec;
				console.log('fileuri', fileuri);
				
				//var newuri = Services.io.newURI(newVal, null, null);
				//var newValRep = 'file:///' + newuri.spec.replace(/\\/g, '/');
				
 				var css = '#navigator-throbber[loading] { list-style-image: url("' + fileuri + '") !important; }';
				var newURIParam = {
					aURL: 'data:text/css,' + encodeURIComponent(css),
					aOriginCharset: null,
					aBaseURI: null
				};
				cssUri_CustomImgLoading = Services.io.newURI(newURIParam.aURL, newURIParam.aOriginCharset, newURIParam.aBaseURI);
				myServices.sss.loadAndRegisterSheet(cssUri_CustomImgLoading, myServices.sss.USER_SHEET); //running this last as i think its syncronus
			}
		}
	}
}
/**
 * if want to change value of preference dont do prefs.holdTime.value = blah, instead must do `prefs.holdTime.setval(500)`
 * because this will then properly set the pref on the branch then it will do the onChange properly with oldVal being correct
 * NOTE: this fucntion prefSetval is not to be used directly, its only here as a contructor
 */
function prefSetval(name) {
	return function(updateTo) {
		console.log('in prefSetval');
		console.info('this = ', this);
		if ('json' in this) {
			//updateTo must be an object
			if (Object.prototype.toString.call(updateTo) != '[object Object]') {
				console.warn('EXCEPTION: prefs[name] is json but updateTo supplied is not an object');
				return;
			}
			
			var stringify = JSON.stringify(updateTo); //uneval(updateTo);
			myPrefListener._branch['set' + this.type + 'Pref'](name, stringify);
			//prefs[name].value = {};
			//for (var p in updateTo) {
			//	prefs[name].value[p] = updateTo[p];
			//}
		} else {
			//prefs[name].value = updateTo;
			myPrefListener._branch['set' + this.type + 'Pref'](name, updateTo);
		}
	};
}
///pref listener generic stuff NO NEED TO EDIT
/**
 * @constructor
 *
 * @param {string} branch_name
 * @param {Function} callback must have the following arguments:
 *   branch, pref_leaf_name
 */
function PrefListener(branch_name, callback) {
  // Keeping a reference to the observed preference branch or it will get garbage collected.
	this._branch = Services.prefs.getBranch(branch_name);
	this._defaultBranch = Services.prefs.getDefaultBranch(branch_name);
	this._branch.QueryInterface(Ci.nsIPrefBranch2);
	this._callback = callback;
}

PrefListener.prototype.observe = function(subject, topic, data) {
	console.log('incomcing PrefListener observe', 'topic=', topic, 'data=', data, 'subject=', subject);
	if (topic == 'nsPref:changed')
		this._callback(this._branch, data);
};

/**
 * @param {boolean=} trigger if true triggers the registered function
 *   on registration, that is, when this method is called.
 */
PrefListener.prototype.register = function(setDefaults, trigger) {
	//adds the observer to all prefs and gives it the seval function
	
	for (var p in prefs) {
		prefs[p].setval = new prefSetval(p);
	}
	
	console.log('added setval');
	if (setDefaults) {
		this.setDefaults();
		console.log('finished set defaults');
	}
	
	//should add observer after setting defaults otherwise it triggers the callbacks
	this._branch.addObserver('', this, false);
	console.log('added observer');
	
	if (trigger) {
		console.log('trigger callbacks');
		this.forceCallbacks();
		console.log('finished all callbacks');
	}
};

PrefListener.prototype.forceCallbacks = function() {
	console.log('forcing pref callbacks');
    let that = this;
    this._branch.getChildList('', {}).
      forEach(function (pref_leaf_name)
        { that._callback(that._branch, pref_leaf_name); });
};

PrefListener.prototype.setDefaults = function() {
	//sets defaults on the prefs in prefs obj
	console.log('doing setDefaults');
	for (var p in prefs) {
		console.log('will now set default on ', p);
		console.log('will set it to "' + prefs[p].default + '"');
		this._defaultBranch['set' + prefs[p].type + 'Pref'](p, prefs[p].default);
		console.log('fined setting default on ', p);
	}
	console.log('set defaults done');
};

PrefListener.prototype.unregister = function() {
  if (this._branch)
    this._branch.removeObserver('', this);
};

var myPrefListener = new PrefListener(prefPrefix, function (branch, name) {
	//extensions.myextension[name] was changed
	console.log('callback start for pref: ', name);
	if (!(name in prefs)) {
		console.warn('name is not in prefs so return name = ', name);
		//added this because apparently some pref named prefPreix + '.sdk.console.logLevel' gets created when testing with builder
		//ALSO gets here if say upgraded, and in this version this pref is not used (same with downgraded)
		return;
	}

	var refObj = {name: name}; //passed to onPreChange and onChange
	var oldVal = 'json' in prefs[name] ? prefs[name].json : prefs[name].value;
	try {
		var newVal = myPrefListener._branch['get' + prefs[name].type + 'Pref'](name);
	} catch (ex) {
		console.warn('exception when getting newVal (likely the pref was removed): ' + ex);
		var newVal = null; //note: if ex thrown then pref was removed (likely probably)
	}
	console.log('oldVal == ', oldVal);
	console.log('newVal == ', newVal);
	prefs[name].value = newVal === null ? prefs[name].default : newVal;

	if ('json' in prefs[name]) {
		refObj.oldValStr = oldVal;
		oldVal = JSON.parse(oldVal); //function(){ return eval('(' + oldVal + ')') }();

		refObj.newValStr = prefs[name].value;
		prefs[name].json = prefs[name].value;
		prefs[name].value =  JSON.parse(prefs[name].value); //function(){ return eval('(' + prefs[name].value + ')') }();
	}

	if (prefs[name].onChange) {
		prefs[name].onChange(oldVal, prefs[name].value, refObj);
	}
	console.log('myPrefCallback done');
});
////end pref listener stuff
//end pref stuff
