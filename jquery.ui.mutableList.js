(function($) {
$.widget('ui.mutableList', {
	'options': {
		'name': false,
		'add': false,
		'edit': false,
		'delete': false,
		'refresh': false,
		'refreshUrl': false,
		'target': false,
		'preload': true,
		'tmpl': {
			'add': {
				'name': false,
				'url': false
			},
			'edit': {
				'name': false,
				'url': false
			},
			'delete': {
				'name': false,
				'url': false
			},
			'list': {
				'name': false,
				'url': false
			}
		},
		'callbacks': {
			'add': false,
			'edit': false,
			'delete': false,
			'list': false,
			'refresh': false
		}
	},
	'_list': [],
	'_dialog': false,
	'_create': function() {
		var self = this;
		var name = self.options.name;
		if (!name) {
			$.error('A name for this instance of mutableList must be supplied in the options.');
			return false;
		}
		var links = ['add', 'edit', 'delete', 'refresh'];
		var tmp = '';
		for (var i in links) {
			if (!self.options[links[i]]) {
				tmp = '.' + name + links[i].charAt(0).toUpperCase() + links[i].slice(1);
				self.options[links[i]] = tmp;
			}
		}
		if (!self.options.target) {
			self.options.target = '.' + name + 'List';
		}
		for (var key in self.options.tmpl) {
			if (!self.options.tmpl[key].name && self.options.tmpl[key].url !== false) {
				self.options.tmpl[key].name = name + key.charAt(0).toUpperCase() + key.slice(1) + 'Tmpl';
			}
		}
		if (self.options.preload) {
			self.loadTemplate();
		}
		$(self.options.add, self.element).bind('click', function() {
			self.add($(this));
			return false;
		});
		self.list(true);
	},
	'list': function(refresh, options) {
		var self = this;
		function _load() {
			self.loadTemplate('list', function() {
				if (typeof self.options.callbacks.list == 'function') {
					self.options.callbacks.list.apply(self, [self.template('list'), self._list, options]);
				} else {
					$(self.options.target, self.element).empty();
					$.tmpl(self.options.tmpl.list.name, self._list).appendTo($(self.options.target, self.element));
					if (self.options.edit) {
						$(self.options.edit, self.element).bind('click', function() {
							self.edit($(this));
							return false;
						});
					}
					if (self.options.delete) {
						$(self.options.delete, self.element).bind('click', function() {
							self.delete($(this));
							return false;
						});
					}
				}
			});
		}
		if (refresh) {
			self.refresh(_load);
		} else {
			_load();
		}
	},
	'add': function(link) {
		var self = this;
		self.loadTemplate('add', function() {
			if (typeof self.options.callbacks.add == 'function') {
				self.options.callbacks.add.apply(self, [self.template('add'), link]);
			} else {
				self.loadDialog('add', {url: self.checkExtension(link.attr('href'), 'json')}, 'Add');
			}
		});
	},
	'edit': function(link) {
		var self = this;
		self.loadTemplate('edit', function() {
			if (typeof self.options.callbacks.edit == 'function') {
				self.options.callbacks.edit.apply(self, [self.template('edit'), link]);
			} else {
				$.ajax({
					url: self.checkExtension(link.attr('href'), 'json'),
					type: 'post',
					dataType: 'json',
					success: function(data) {
						self.loadDialog('edit', $.extend(data, {url: self.checkExtension(link.attr('href'), 'json')}), 'Submit');
					}
				});
			}
		});
	},
	'delete': function(link) {
		var self = this;
		self.loadTemplate('delete', function() {
			if (typeof self.options.callbacks.delete == 'function') {
				self.options.callbacks.delete.apply(self, [self.template('delete'), link]);
			} else {
				self.loadDialog('delete', {url: self.checkExtension(link.attr('href'), 'json')}, 'Delete');
			}
		});
	},
	'refresh': function(callback) {
		var self = this;
		if (!self.options.refreshUrl) {
			$.error('Must define a refresh url in the options object');
		}
		if (typeof self.options.callbacks.refresh == 'function') {
			self.options.callbacks.refresh.apply(self, []);
		} else {
			$.ajax({
				url: self.checkExtension(self.options.refreshUrl, 'json'),
				type: 'get',
				dataType: 'json',
				success: function(data) {
					self._trigger(self.options.name + 'DataRefresh');
					self._list = data;
					if (typeof callback == 'function') {
						callback();
					}
					return;
				}
			});
		}
	},
	'data': function() {
		return this._list;
	},
	'template': function(type) {
		var self = this;
		var ret = false;
		if (self.options.tmpl[type] && typeof self.options.tmpl[type].name == 'string') {
			ret = self.options.tmpl[type].name;
		}
		return ret;
	},
	'loadTemplate': function(type, method) {
		var self = this;
		var items = self.options.tmpl;
		var count = 0;
		for (var key in items) {
			if (key !== '__proto__')
				count++;
		}
		if (!count) {
			return false;
		}
		if (type != undefined && items[type]) {
			var tmp = items[type];
			items = {};
			items[type] = tmp;
		}
		for (var key in items) {
			var name = items[key].name || false;
			var url = items[key].url || false;
			if (name && url)
				$.loadTemplate(name, self.checkExtension(url, 'tmpl'), method);
		}
		return true;
	},
	'loadDialog': function(name, data, button) {
		var self = this;
		var dialog = self._dialog;
		var tmpl = self.template(name);
		if (!dialog && typeof tmpl == 'string') {
			if (typeof data != 'object') {
				data = {};
			}
			var buttons = {};
			if (button == undefined) {
				button = 'Submit';
			}
			buttons[button] = function() {
				self.submitForm(name, $('form', $(this)));
			}
			buttons['Cancel'] = function() {
				dialog.dialog('close');
			}
			dialog = $
				.tmpl(tmpl, data)
				.appendTo('body')
				.dialog({
					autoOpen: true,
					modal: true,
					closeText: 'x',
					resizable: false,
					buttons: buttons,
					close: function() {
						$(this).remove();
						self._dialog = false;
					}
				});
			dialog.find('form').submit(function() {
				self.submitForm(name, $(this));
				return false;
			});
			dialog.find('form select[data-option-selected]').each(function(index) {
				var select = $(this).attr('data-option-selected');
				$('option[value='+select+']', $(this)).attr('selected', 'selected');
			});
			self._dialog = dialog;
		}
	},
	'submitForm': function(type, form) {
		var self = this;
		form.ajaxSubmit({
			dataType: 'json',
			success: function(data) {
				self._trigger(type + 'FormSuccess', [data]);
				self._dialog.dialog('close');
				self._dialog = false;
				self.list(true, data);
			},
			error: function(xhr, status, error) {
				self._trigger(type + 'FormError', [xhr, status, error]);
			}
		});
	},
	'checkExtension': function(url, ext) {
		if (!url || !ext || typeof url != 'string' || typeof ext != 'string') {
			return false;
		}
		if (ext.charAt(0) == '.') {
			ext = ext.slice(1);
		}
		var re = new RegExp('\.(' + ext + '){1}$');
		if (url.search(re) == -1) {
			url = url + '.' + ext;
		}
		return url;
	}
});

})(jQuery);