(function($) {
	$.fn.DEFileUpload = function(options) {
		var settings = $.extend({
			action: "",
			// 是否自动上传，非自动上传需要手动触发upload事件
			autoUpload: false,
			// 允许的文件类型
			allowedExts: null,
			// 最大文件大小
			maxFileSize: 10 * 1024 * 1024,
			params: {},
			// 上传之前的处理工作，检验文件类型和大小等
			onSubmit: function(filename, files) {},
			onSuccess: function(filename, response) {},
			onError: function(code, filename, response) {},
			onComplete: function(filename, response) {}
		}, options)

		var randomId = (function() {
			var id = 0
			return function() {
				return "DEFileUpload" + id++
			}
		})()

		var createForm = function(iframe) {
			var attrs = {
				method: "post",
				action: settings.action,
				enctype: "multipart/form-data",
				target: iframe[0].name
			}
			return $("<form />").attr(attrs).hide().appendTo("body")
		}

		var createIframe = function() {
			var id = randomId()
			// The iframe must be appended as a string otherwise IE7 will pop up the response in a new window
			// http://stackoverflow.com/a/6222471/268669
			$("body").append('<iframe src="javascript:false;" name="' + id + '" id="' + id +
				'" style="display: none;"></iframe>')
			return $('#' + id)
		}

		var upload = function(e) {
			var $element = $(e.target)
			var id = $element.attr('id')
			var $clone = $element.removeAttr('id').clone().attr('id', id).DEFileUpload(options)
			var filename = $element.val().replace(/.*(\/|\\)/, "")
			var iframe = createIframe()
			var form = createForm(iframe)

			// We append a clone since the original input will be destroyed
			$clone.insertBefore($element)

			iframe.on("load", {
				element: $clone,
				form: form,
				filename: filename
			}, function(e) {
				var $iframe = $(e.target)
				var doc = ($iframe[0].contentWindow || $iframe[0].contentDocument).document
				var response = $(doc.body).text()
				var errorCode
				// Remove the temporary form and iframe
				e.data.form.remove()
				$iframe.remove()

				try {
					if (response) {
						response = $.parseJSON(response)
					} else {
						errorCode = 'EMPTY_RET'
					}
				} catch (e) {
					errorCode = 'RET_ERR'
				}

				if (!errorCode) {
					settings.onSuccess.call(e.data.element, e.data.filename, response)
				} else {
					settings.onError.call(e.data.element, errorCode, e.data.filename, response)
				}

				settings.onComplete.call(e.data.element, e.data.filename, response)
			})

			var params = {
				element: $clone,
				iframe: iframe,
				filename: filename,
				files: e.target.files
			}

			form.append($element).on("submit", params, onSubmit).submit()
		}

		// 后缀检测、大小检测、表单数据追加
		var onSubmit = function(e) {
			var filename = e.data.filename
			var file = e.data.files && e.data.files[0]
			var ext = filename.split('.').pop()

			if ($.isArray(settings.allowedExts) && $.inArray(ext, settings.allowedExts) == -1) {
				settings.onError.call(e.data.element, 'EXT_ERR')
				return false
			}

			if (file && file.size > settings.maxFileSize) {
				settings.onError.call(e.data.element, 'SIZE_ERR')
				return false
			}

			var goSubmit = settings.onSubmit.call(e.data.element, e.data.filename, e.data.files)
			if (goSubmit === false) {
				$(e.target).remove()
				e.data.iframe.remove()
				return false
			} else {
				// 附加数据
				var data = $.isFunction(settings.params) ? settings.params(e.data.filename) : settings.params
				for (var variable in data) {
					$("<input />").attr("type", "hidden").attr("name", variable)
						.val(data[variable]).appendTo(e.target)
				}
			}
		}

		return this.each(function() {
			var $this = $(this)
			if ($this.is("input") && $this.attr("type") === "file") {
				$this.on(settings.autoUpload ? "change" : "upload", upload)
			}
		})
	}
})(jQuery)
