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

Cu.import('resource://gre/modules/Services.jsm');
Cu.import('resource:///modules/CustomizableUI.jsm');
Cu.import('resource://gre/modules/devtools/Console.jsm');
Cu.import('resource://gre/modules/XPCOMUtils.jsm');
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
		var throbber = tab.ownerDocument.getAnonymousElementByAttribute(tab, 'class', 'tab-throbber')
		this.gMutationObserver.observe(throbber, gMutationConfig);
		
		if (throbber.hasAttribute('busy')) {
			this.gThrobber.setAttribute('loading', 'true');
		} else {
			this.gThrobber.removeAttribute('loading');
		}
	};
	
	this.onTabSelectBinded = this.onTabSelect.bind(this);
	
	this.init = function() {
		this.gBrowser.tabContainer.addEventListener('TabSelect', this.onTabSelectBinded, false);
		var tab = this.gBrowser.selectedTab;
		var throbber = tab.ownerDocument.getAnonymousElementByAttribute(tab, 'class', 'tab-throbber');
		this.gMutationObserver.observe(throbber, gMutationConfig);
		
		var gThrobberIcon = this.gThrobber.ownerDocument.getAnonymousElementByAttribute(this.gThrobber, 'class', 'toolbarbutton-icon');
		gThrobberIcon.removeAttribute('class');
	};
	
	this.destroy = function() {
		this.gMutationObserver.disconnect();
		this.gBrowser.tabContainer.removeEventListener('TabSelect', this.onTabSelectBinded, false);
	};
}

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
	
	CustomizableUI.createWidget({ //must run createWidget before windowListener.register because the register function needs the button added first
		id : 'navigator-throbber',
		defaultArea : CustomizableUI.AREA_NAVBAR,
		label : 'Activity Indicator',
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
	windowListener.unregister();
	CustomizableUI.destroyWidget('navigator-throbber');
	myServices.sss.unregisterSheet(cssUri, myServices.sss.USER_SHEET); //running htis last as i think its syncronus
}

function install() {}

function uninstall() {}