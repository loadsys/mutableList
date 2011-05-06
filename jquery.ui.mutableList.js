(function($) {
/**
 * This plugin is the consolidation of all the plugins above into a
 * single reusable plugin. Functionality for edit and delete will 
 * also be added here.
 */
$.widget('ui.mutableList', {
	'options': {
		'name': 'mutableList',
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
		}
	},
	'_list': [],
	'_dialog': false,
	'_create': function() {
		var self = this;
		var name = self.options.name;
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
				self.options.tmpl[key].name = name + key + 'Tmpl';
			}
		}
		if (self.options.preload) {
			self._loadTemplate();
		}
		$(self.options.add, self.element).bind('click', function() {
			self.add($(this));
			return false;
		});
		self.list(true);
	},
	'list': function(refresh) {
		var self = this;
		function _load() {
			self._loadTemplate('list', function() {
				$.tmpl(self.options.tmpl.list.name, self._list).appendTo(self.options.target);
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
		self._loadTemplate('add', function() {
			self._loadDialog(self.options.tmpl.add.name, {url: link.attr('href')}, 'Add');
		});
	},
	'edit': function(link) {
		var self = this;
		self._loadTemplate('edit', function() {
			$.ajax({
				url: link.attr('href') + '.json',
				type: 'post',
				dataType: 'json',
				success: function(data) {
					console.log(data);
					self._loadDialog(self.options.tmpl.edit.name, $.extend(data, {url: link.attr('href')}), 'Submit');
				}
			});
		});
	},
	'delete': function(link) {
		var self = this;
		self._loadTemplate('delete', function() {
			self._loadDialog(self.options.tmpl.delete.name, {url: link.attr('href')}, 'Delete');
		});
	},
	'refresh': function(callback) {
		var self = this;
		if (!self.options.refreshUrl) {
			$.error('Must define a refresh url in the options object');
		}
		$.ajax({
			url: self.options.refreshUrl,
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
	},
	'_loadTemplate': function(type, method) {
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
				$.loadTemplate(name, url, method);
		}
		return true;
	},
	'_loadDialog': function(name, data, button) {
		var self = this;
		var dialog = self._dialog
		if (!dialog) {
			if (typeof data != 'object') {
				data = {};
			}
			var buttons = {};
			if (button == undefined) {
				button = 'Submit';
			}
			buttons[button] = function() {
				//self.submitForm($('form', $(this)));
			}
			buttons['Cancel'] = function() {
				dialog.dialog('close');
			}
			dialog = $
				.tmpl(name, data)
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
				//self.submitForm($(this));
				return false;
			});
			dialog.find('form select[select]').each(function(index) {
				var select = $(this).attr('select');
				$('option[value='+select+']', $(this)).attr('selected', 'selected');
			});
			self._dialog = dialog;
		}
	}
});

})(jQuery);