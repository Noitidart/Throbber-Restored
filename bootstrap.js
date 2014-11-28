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
				//console.log('m.attributeName = ', m.attributeName, 'm.oldValue = ', m.oldValue);
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
		//console.error('this window does not have gBrowser');
	}
	if (!this.gThrobber) {
		//console.error('this window does not have gThrobber');
	}
	if (!this.gBrowser.tabContainer) {
		//console.warn('this window does not have tabContainer, but just an exception/warning NOT an error');
	}
	
	this.onTabSelect = function(e) {
		//console.log('tab seld yaaa ' + new Date().getTime());
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
				
				/*start - set up xul on custom images settings*/
				var custImgIdle = doc.querySelector('setting[pref="extensions.ThrobberRestored.customImgIdle"]');
				var custImgLoading = doc.querySelector('setting[pref="extensions.ThrobberRestored.customImgLoading"]');
				var custImgSettings = {customImgIdle: custImgIdle, customImgLoading: custImgLoading}; //key = pref name in prefs object value is the setting xul element
				
				for (var n in custImgSettings) {
					var props = {
						id: 'resetBtn_' + n,
						label: 'Restore Default',
						anonid: 'resetbtn'
					};
					if (prefs[n].value == '') {
						props.style = 'display:none;'
					}
					var preExEl = doc.querySelector('#' + props.id);
					if (preExEl) { //label is already there so continue, so remove it then we'll add again
						preExEl.parentNode.removeChild(preExEl);
					}
					var el = doc.createElementNS('http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul', 'button');
					
					console.log('starting bind');
					var bound = function(settingPrefName, settingXUL) {
						console.log('calling the bound func');
						prefs[settingPrefName].setval('');
						settingXUL.inputChanged();
					}.bind(null, n, custImgSettings[n]);
					console.log('adding event listener to ' + n);
					el.addEventListener('command', bound, false);
					for (var p in props) {
						el.setAttribute(p, props[p]);
					}
					var browseBtn = doc.getAnonymousElementByAttribute(custImgSettings[n], 'anonid', 'button');
					browseBtn.parentNode.insertBefore(el, browseBtn);
					//start the oninput changed method
					var setattr = '';
					//setattr += 'alert(\'starting ' + n + '\');';
					setattr += 'var resetBtn = document.getAnonymousElementByAttribute(this, \'anonid\', \'resetbtn\');';
					setattr += 'var img = document.getAnonymousElementByAttribute(this, \'anonid\', \'preview\');';
					setattr += 'if (this.value != "") {'
					setattr += 'resetBtn.style.display = \'\';';
					setattr += 'resetBtn.style.display = \'\';';
					setattr += 'img.src = Services.io.newFileURI(new FileUtils.File(this.value)).spec;';
					setattr += 'img.setAttribute(\'value\', this.value);';
					setattr += '} else {';
					setattr += 'resetBtn.style.display = \'none\';';
					setattr += 'img.src = \'\';';
					setattr += '}';
					//setattr += 'alert(\'done\');';
					custImgSettings[n].setAttribute('oninputchanged', setattr);
					//end the oninput changed method
					
					//add idle img preview
					var browseLbl = doc.getAnonymousElementByAttribute(custImgSettings[n], 'anonid', 'input');
					browseLbl.style.display = 'none';
					
					var el = doc.createElementNS('http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul', 'image');
					var props = {
						id: 'imgPreview_' + n,
						onclick: 'alert(\'Original Path of Image on Disk: "\' + this.getAttribute(\'value\') + \'"\')',
						anonid: 'preview',
						src: '',
						value: ''
					};
					var preExEl = doc.querySelector('#' + props.id);
					if (preExEl) { //so remove it then we'll add again (just in case this is an update or something and something changed)
						preExEl.parentNode.removeChild(preExEl);
					}
					if (prefs[n].value != '') {
						var normalized = OS.Path.normalize(prefs[n].value);
						//var profRootDirLoc = OS.Path.join(OS.Constants.Path.profileDir, OS.Path.basename(normalized));
						var profRootDirLoc = OS.Path.join(OS.Constants.Path.profileDir, 'throbber-restored-' + n);
						props.src = Services.io.newFileURI(new FileUtils.File(profRootDirLoc)).spec;
						props.value = prefs[n].value;
					}
					for (var p in props) {
						el.setAttribute(p, props[p]);
					}
					browseLbl.parentNode.insertBefore(el, browseLbl);
					//end idle img preview
				}
				/*end - set up xul on custom images settings*/
				
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
				//console.warn('exception while destroying worker i = ',  i, 'ex = ', ex);
			}
			//console.log('done destorying worker i = ',  i);
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
	
	try {
		CustomizableUI.removeWidgetFromArea('navigator-throbber'); //have to do this because its the fix for issue #11, its weird how it doesnt affect all people, probably something to do with CTR
	} catch (ex) {
		console.info('on remove widge of old id ran into ex:', ex);
	}
	try {
		CustomizableUI.removeWidgetFromArea('throbber-restored'); //have to do this because its the fix for issue #11, its weird how it doesnt affect all people, probably something to do with CTR
	} catch (ex) {
		console.info('on remove widge of old id ran into ex:', ex);
	}
	
	CustomizableUI.createWidget({ //must run createWidget before windowListener.register because the register function needs the button added first
		id: 'navigator-throbber',
		type: 'custom',
		defaultArea: CustomizableUI.AREA_NAVBAR,
		onBuild: function(aDocument) {
			var toolbaritem = aDocument.createElementNS('http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul', 'toolbaritem');
			var image = aDocument.createElementNS('http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul', 'image');
			
			var props = {
				id: 'navigator-throbber',
				title: 'Activity Indicator',
				align: 'center',
				pack: 'center',
				mousethrough: 'always',
				removable: 'true',
				sdkstylewidget: 'true',
				overflows: false
			};
			for (var p in props) {
				toolbaritem.setAttribute(p, props[p]);
			}
			
			toolbaritem.appendChild(image);
			return toolbaritem;
		}
	});
	
	var newURIParam = {
		aURL: self.path.chrome + 'toolbarbutton.css',
		aOriginCharset: null,
		aBaseURI: null
	}
	cssUri = Services.io.newURI(newURIParam.aURL, newURIParam.aOriginCharset, newURIParam.aBaseURI);
	//console.log('aURL=', self.path.chrome + 'toolbarbutton.css');
	//console.log('cssUri=', cssUri);
	
	windowListener.register();
	
	myServices.sss.loadAndRegisterSheet(cssUri, myServices.sss.USER_SHEET); //running this last as i think its syncronus
	//console.log('here');
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
		//if custom images were used lets delete them now
		var customImgPrefs = ['customImgIdle', 'customImgLoading'];
		[].forEach.call(customImgPrefs, function(n) {
			//cant check the pref i guess because it may be unintialized or deleted before i used have a `if(prefs[n].value != '') {`
			//var normalized = OS.Path.normalize(prefs[n].value);
			//var profRootDirLoc = OS.Path.join(OS.Constants.Path.profileDir, OS.Path.basename(normalized));
			var profRootDirLoc = OS.Path.join(OS.Constants.Path.profileDir, 'throbber-restored-' + n);
			var promiseDelete = OS.File.remove(profRootDirLoc);
			console.log('profRootDirLoc', profRootDirLoc)
			promiseDelete.then(
				function() {
					//Services.prompt.alert(null, 'deleted', 'success on ' + n);
				},
				function(aRejReas) {
					console.warn('Failed to delete copy of custom throbber ' + n + ' image for reason: ', aRejReas);
					//Services.prompt.alert(null, 'deleted', 'FAILED on ' + n);
				}
			);
		});
		
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
			var msga = '';
			if (oldVal === null) {
				msga = 'register/init';
			} else if (oldVal == newVal) {
				msga = 'probably a programmatic force';
			} else if (oldVal != newVal) {
				msga = 'really chaning';
			}
			//Services.prompt.alert(null, 'prefChange - ' + refObj.name, msga);
			if (oldVal && oldVal != '') {
				myServices.sss.unregisterSheet(cssUri_CustomImgIdle, myServices.sss.USER_SHEET);
				//Services.prompt.alert(null, 'sheet unreg', 'old sheet unrgistered');
			}
			newVal = newVal.trim();
			if (newVal == '') {
				cssUri_CustomImgIdle = '';
				if (oldVal !== null && oldVal != '') {
					//lets delete the old one from profile folder
					var normalized = OS.Path.normalize(oldVal);
					//var profRootDirLoc = OS.Path.join(OS.Constants.Path.profileDir, OS.Path.basename(normalized));
					var profRootDirLoc = OS.Path.join(OS.Constants.Path.profileDir, 'throbber-restored-customImgIdle');
					var promiseDelete = OS.File.remove(profRootDirLoc);
					promiseDelete.then(
						function() {
							//Services.prompt.alert(null, 'deleted', 'success');
						},
						function(aRejReas) {
							console.warn('Failed to delete copy of custom throbber IDLE image for reason: ', aRejReas);
							//Services.prompt.alert(null, 'deleted', 'FAILED');
						}
					);
				}
			} else {
				var normalized = OS.Path.normalize(newVal);
				//var profRootDirLoc = OS.Path.join(OS.Constants.Path.profileDir, OS.Path.basename(normalized));
				var profRootDirLoc = OS.Path.join(OS.Constants.Path.profileDir, 'throbber-restored-customImgIdle');
				
				var applyIt = function() {
					var file = new FileUtils.File(profRootDirLoc);
					var fileuri = Services.io.newFileURI(file).spec;
					console.log('fileuri', fileuri);
					//var newuri = Services.io.newURI(newVal, null, null);
					//var newValRep = 'file:///' + newuri.spec.replace(/\\/g, '/');
					
					var css = '#navigator-throbber:not([loading]) { list-style-image: url("' + fileuri + '#' + Math.random() + '") !important; }';
					var newURIParam = {
						aURL: 'data:text/css,' + encodeURIComponent(css),
						aOriginCharset: null,
						aBaseURI: null
					};
					cssUri_CustomImgIdle = Services.io.newURI(newURIParam.aURL, newURIParam.aOriginCharset, newURIParam.aBaseURI);
					myServices.sss.loadAndRegisterSheet(cssUri_CustomImgIdle, myServices.sss.USER_SHEET); //running this last as i think its syncronus
				}
				
				if (oldVal !== null) {
					//lets copy it to profile folder
					var promiseCopy = OS.File.copy(normalized, profRootDirLoc);
					promiseCopy.then(
						function() {
							console.log('copy completed succesfully');
							applyIt();
						},
						function(aRejReas) {
							console.error('copy failed reason: ', aRejReas);
							throw new Error('FAILED TO COPY IMAGE TO PROFILE ROOT DIRECTORY');
						}
					);
				} else {
					console.log('just going to directly apply it');
					applyIt();
				}
			}
		}
	},
	customImgLoading: {
		default: '',
		value: null,
		type: 'Char',
		onChange: function(oldVal, newVal, refObj) {
			var msga = '';
			if (oldVal === null) {
				msga = 'register/init';
			} else if (oldVal == newVal) {
				msga = 'probably a programmatic force';
			} else if (oldVal != newVal) {
				msga = 'really chaning';
			}
			//Services.prompt.alert(null, 'prefChange - ' + refObj.name, msga);
			if (oldVal && oldVal != '') {
				console.log('cssUri_CustomImgLoading', cssUri_CustomImgLoading);
				myServices.sss.unregisterSheet(cssUri_CustomImgLoading, myServices.sss.USER_SHEET);
				//Services.prompt.alert(null, 'sheet unreg', 'old sheet unrgistered');
			}
			newVal = newVal.trim();
			if (newVal == '') {
				cssUri_CustomImgLoading = '';
				if (oldVal !== null && oldVal != '') {
					//lets delete the old one from profile folder
					var normalized = OS.Path.normalize(oldVal);
					//var profRootDirLoc = OS.Path.join(OS.Constants.Path.profileDir, OS.Path.basename(normalized));
					var profRootDirLoc = OS.Path.join(OS.Constants.Path.profileDir, 'throbber-restored-customImgLoading');
					var promiseDelete = OS.File.remove(profRootDirLoc);
					promiseDelete.then(
						function() {
							//Services.prompt.alert(null, 'deleted', 'success');
						},
						function(aRejReas) {
							console.warn('Failed to delete copy of custom throbber LOADING image for reason: ', aRejReas);
							//Services.prompt.alert(null, 'deleted', 'FAILED');
						}
					);
				}
			} else {
				var normalized = OS.Path.normalize(newVal);
				//var profRootDirLoc = OS.Path.join(OS.Constants.Path.profileDir, OS.Path.basename(normalized));
				var profRootDirLoc = OS.Path.join(OS.Constants.Path.profileDir, 'throbber-restored-customImgLoading');
				
				var applyIt = function() {
					var file = new FileUtils.File(profRootDirLoc);
					var fileuri = Services.io.newFileURI(file).spec;
					console.log('fileuri', fileuri);
					//var newuri = Services.io.newURI(newVal, null, null);
					//var newValRep = 'file:///' + newuri.spec.replace(/\\/g, '/');
					
					var css = '#navigator-throbber[loading] { list-style-image: url("' + fileuri + '#' + Math.random() + '") !important; }';
					var newURIParam = {
						aURL: 'data:text/css,' + encodeURIComponent(css),
						aOriginCharset: null,
						aBaseURI: null
					};
					cssUri_CustomImgLoading = Services.io.newURI(newURIParam.aURL, newURIParam.aOriginCharset, newURIParam.aBaseURI);
					myServices.sss.loadAndRegisterSheet(cssUri_CustomImgLoading, myServices.sss.USER_SHEET); //running this last as i think its syncronus
				}
				
				if (oldVal !== null) {
					//lets copy it to profile folder
					var promiseCopy = OS.File.copy(normalized, profRootDirLoc);
					promiseCopy.then(
						function() {
							console.log('copy completed succesfully');
							applyIt();
						},
						function(aRejReas) {
							console.error('copy failed reason: ', aRejReas);
							throw new Error('FAILED TO COPY IMAGE TO PROFILE ROOT DIRECTORY');
						}
					);
				} else {
					console.log('just going to directly apply it');
					applyIt();
				}
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
