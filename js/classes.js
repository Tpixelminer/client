MyHomeworkSpace.Pages.classes = {
	init: function() {
		$("#addClass").click(function() {
			$("#deleteClassModal").hide();
			$("#className").val("");
			$("#classTeacher").val("");
			$("#classModal").attr("data-actionType", "add");
			$("#classModalType").text("Add");
			$("#classModal").modal();
		});
		$("#submitClassModal").click(function() {
			var type = $("#classModal").attr("data-actionType");
			var id = $("#classModal").attr("data-actionId");
			$("#classModal").modal("hide");
			$("#loadingModal").modal({
				backdrop: "static",
				keyboard: false
			});
			var classItem = {
				name: $("#className").val(),
				teacher: $("#classTeacher").val()
			};
			var classPostDone = function(xhr) {
				MyHomeworkSpace.Pages.classes.handleNew();
			};

			if (type == "add") {
				MyHomeworkSpace.API.post("classes/add", classItem, classPostDone);
			} else {
				classItem.id = id;
				MyHomeworkSpace.API.post("classes/edit", classItem, classPostDone);
			}
		});
		$("#deleteClassModal").click(function() {
			if (confirm("Are you sure you want to delete this?")) {
				$("#classModal").modal('hide');
				$("#loadingModal").modal({
					backdrop: "static",
					keyboard: false
				});
				MyHomeworkSpace.API.get("classes/hwInfo/" + $("#classModal").attr("data-actionId"), {}, function(xhr) {
					var hwItems = xhr.responseJSON.hwItems;
					if (hwItems > 0) {
						if (!confirm("This will ALSO delete the " + hwItems + " homework item(s) associated with this class. Are you *sure*?")) {
							$("#loadingModal").modal("hide");
							return;
						}
					}
					MyHomeworkSpace.API.post("classes/delete", {
						id: $("#classModal").attr("data-actionId")
					}, function() {
						MyHomeworkSpace.Pages.classes.handleNew();
					});
				});
			}
		});
	},
	handleNew: function() {
		MyHomeworkSpace.Classes.load(function() {
			MyHomeworkSpace.Classes.reload();
			$("#loadingModal").modal("hide");
			MyHomeworkSpace.Page.show("classes");
		});
	},
	open: function() {
		$("#classPane").hide();
		$(".classList").html('<ul></ul>');
		for (var classIndex in MyHomeworkSpace.Classes.list) {
			var classItem = MyHomeworkSpace.Classes.list[classIndex];
			var $item = $('<li class="classItem"></li>');
				$item.attr("data-classId", classItem.id);
				var $name = $('<div class="className"></div>');
					$name.text(classItem.name);
				$item.append($name);
				var $teacher = $('<div class="classTeacher"></div>');
					$teacher.text(classItem.teacher);
				$item.append($teacher);
			var $swap = $('<i class="fa fa-arrows-v"></i>');
				$swap.click(function() {
					var $that = $(this);
					var currentId = $(this).parent().attr("data-classId");
					MyHomeworkSpace.API.get("classes/get/" + currentId, {}, function(xhr) {
						$("#classSwapOptions").text("");
						$("#classSwapModal").attr("data-classId", currentId);
						var classItem = xhr.responseJSON.class;
						for (var classIndex in MyHomeworkSpace.Classes.list) {
							var thisClassItem = MyHomeworkSpace.Classes.list[classIndex];
							if (thisClassItem.id == currentId) {
								continue;
							}
							var $classItem = $('<li class="classSwapItem"></li>');
								$classItem.attr("data-classId", thisClassItem.id);
								$classItem.text(thisClassItem.name);
								$classItem.click(function() {
									var oldId = $("#classSwapModal").attr("data-classId");
									var newId = $(this).attr("data-classId");
									$("#classSwapModal").modal('hide');
									$("#loadingModal").modal({
										backdrop: "static",
										keyboard: false
									});
									MyHomeworkSpace.API.post("classes/swap", {
										id1: oldId,
										id2: newId
									}, function(response) {
										MyHomeworkSpace.Pages.classes.handleNew();
									});
								});
							$("#classSwapOptions").append($classItem);
						}
						$(".classSwapName").text(classItem.name);
						$("#classSwapModal").modal();
					});
				});
			$item.append($swap);
			var $edit = $('<i class="fa fa-edit"></i>');
				$edit.click(function() {
					var $that = $(this);
					MyHomeworkSpace.API.get("classes/get/" + $(this).parent().attr("data-classId"), {}, function(xhr) {
						var classItem = xhr.responseJSON.class;
						$("#deleteClassModal").show();
						$("#classModal").attr("data-actionType", "edit");
						$("#classModal").attr("data-actionId", $that.parent().attr("data-classId"));
						$("#className").val(classItem.name);
						$("#classTeacher").val(classItem.teacher);
						$("#classModalType").text("Edit");
						$("#classModal").modal();
					});
				});
			$item.append($edit);
			$(".classList ul").append($item);
		}
	}
};
