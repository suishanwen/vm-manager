AdminMainController.$inject = ["$scope", "$location", "modalOpt", "$interval", "httpPostService", "api"];
function AdminMainController($scope, $location, modalOpt, $interval, httpPostService, api) {

    (function () {
        if (sessionStorage.loginUser && sessionStorage.loginUserState > 0) {
            initFun();
        } else {
            $location.path('/admin-login');
        }
    })();

    function initFun() {
        $scope.addVmModal = false;
        $scope.addProjectModal = false;
        $scope.buttonShow = false;
        $scope.checkDmOnly = false;
        $scope.count = 0;
        $scope.employeeList = [];
        $scope.employeeNo = "";
        $scope.employeeSelectShow = false;
        $scope.inputCode = "";
        $scope.isPc = IsPC();
        $scope.isNormalUser = sessionStorage.loginUserState == "1";
        $scope.modalOpt = modalOpt;
        $scope.projectSearchShow = false;
        $scope.projectList = [];
        $scope.selectedVm = null;
        $scope.selectedProject = null;
        $scope.selectedProjects = [];
        $scope.showAll = false;
        $scope.selectAll = false;
        $scope.vmList = [];
        $scope.vmListOld = [];
        $scope.amountInfo = {"total": 0, "increase": 0};
        initEmployeeInfo();
        $interval(function () {
            if ($scope.count > 0) {
                $scope.count--;
            }
            if ($scope.count === 0) {
                getVmList();
            }
        }, 1000);
    }

    $scope.addNewVm = addNewVm;
    $scope.addNewProject = addNewProject;
    $scope.addInfo = addInfo;
    $scope.buttonDelayHide = buttonDelayHide;
    $scope.changeProject = changeProject;
    $scope.changeState = changeState;
    $scope.closeProjectSearchEvent = closeProjectSearchEvent;
    $scope.closeEmployeeSelectEvent = closeEmployeeSelectEvent;
    $scope.deleteVm = deleteVm;
    $scope.getVmState = getVmState;
    $scope.getOperateButton = getOperateButton;
    $scope.getOperationShow = getOperationShow;
    $scope.getProjectInfo = getProjectInfo;
    $scope.initNewVm = initNewVm;
    $scope.initNewProject = initNewProject;
    $scope.refreshVmInfo = getVmList;
    $scope.removeEmployee = removeEmployee;
    $scope.selectVm = selectVm;
    $scope.searchProject = searchProject;
    $scope.selectProject = selectProject;
    $scope.setSelectedProject = setSelectedProject;
    $scope.selectProjectSearch = selectProjectSearch;
    $scope.selectEmployee = selectEmployee;
    $scope.setSelectedEmployee = setSelectedEmployee;
    $scope.showEmployeeSelectEvent = showEmployeeSelectEvent;

    function addNewVm() {
        $scope.initNewVm();
        $scope.addVmModal = true;
    }

    function addNewProject() {
        $scope.initNewProject();
        $scope.addProjectModal = true;
    }

    function addInfo(type) {
        var url;
        var object;
        if (type === "vm") {
            url = api.vmAdd;
            object = $scope.newVm;
        } else {
            url = api.projectAdd;
            object = $scope.newProject;
        }
        httpPostService.call(url, object)
            .then(function (tag) {
                if (tag === "1") {
                    alert("添加失败:已存在！")
                } else {
                    alert("添加成功！");
                    $scope.addVmModal = false;
                    $scope.addProjectModal = false;
                    if (type === "vm") {
                        getVmList();
                    }
                }
            }, function (data) {
                alert("服务器异常：添加失败！");
            });
    }

    function buttonDelayHide() {
        setTimeout(function () {
            $scope.buttonShow = false;
        }, 8000)
    }

    function changeProject(index) {
        if ($scope.selectedProjects.length === 0) {
            alert("请选择项目");
            return;
        }
        var url;
        var params;
        if (index === -1) {
            url = api.vmChangeAll;
            var dmFlag = $scope.checkDmOnly ? 1 : 0;
            params = "admin=" + sessionStorage.loginUser + "&project=" + $scope.selectedProjects[0].name + "&dmFlag=" + dmFlag;
        } else {
            url = api.vmChangeSingle;
            params = "unique=" + sessionStorage.loginUser + "-" + index + "&project=" + $scope.selectedProjects[0].name;
        }
        httpPostService.call(url, null, params)
            .then(function (data) {
                $scope.refreshVmInfo();
            }, function (data) {
                alert("服务器异常：切换失败！");
            });
    }

    function changeState(vm) {
        vm.state = vm.state === -1 ? 0 : -1;
        delete vm.increase;
        delete vm.isDrop;
        httpPostService.call(api.vmUpdate, vm)
            .then(function () {

            }, function (data) {
                alert("服务器异常：更改状态失败！");
            });
    }

    function closeProjectSearchEvent() {
        $scope.projectSearchShow = false;
        $scope.selectedProject = null;
    }

    function closeEmployeeSelectEvent() {
        $scope.employeeSelectShow = false;
        $scope.selectedEmployee = null;
    }

    function deleteVm() {
        if ($scope.selectedVm != null) {
            var result = confirm("要删除虚拟机[" + $scope.selectedVm.sortNo + "]吗?");
            if (!result) {
                return;
            }
            httpPostService.call(api.vmDelete, $scope.selectedVm.id)
                .then(function (data) {
                    $scope.selectedVm = null;
                    getVmList();
                    $scope.vmList = angular.copy(data);
                }, function (data) {
                    alert("删除失败！");
                });
        } else {
            alert("请选择虚拟机！");
        }
    }

    function getVmState(state) {
        var condition = "";
        switch (state) {
            case -1:
                condition = "停用";
                break;
            case 0:
                condition = "接收";
                break;
            case 1:
                condition = "忙碌";
                break;
            case 2:
                condition = "等待";
                break;
        }
        return condition;
    }

    function getOperateButton(state) {
        if (state === -1) {
            return "启用";
        } else {
            return "停用"
        }
    }

    function getOperationShow(state, cate) {
        if (cate === 1) {
            return state !== -1;
        } else {
            return state === -1 || state === 0;
        }
    }

    function getVmList() {
        if ($scope !== angular.element($("#adminMain")).scope()) {
            return;
        }
        $scope.count = 30;
        $scope.selectedVm = null;
        httpPostService.call(api.vms, sessionStorage.loginUser)
            .then(function (data) {
                if (!$scope.showAll) {
                    data = data.filter(function (e) {
                        return e.state !== -1;
                    })
                }
                $scope.vmListOld = angular.copy($scope.vmList);
                $scope.vmList = angular.copy(data);
                if ($scope.vmList.length > 0) {
                    var bak = $scope.amountInfo.total;
                    $scope.amountInfo.total = 0;
                    var now = new Date();
                    var isOldExist = $scope.vmListOld.length > 0 && $scope.vmList.length === $scope.vmListOld.length;
                    $scope.vmList.forEach(function (item, index) {
                        $scope.amountInfo.total += item.success;
                        if (isOldExist) {
                            var increase = item.success - $scope.vmListOld[index].success;
                            item.increase = increase > 0 ? increase : undefined;
                        }
                        item.isDrop = now.getTime() - item.reportTime > 1000 * 60 * 10 ? true : false;
                    });
                    $scope.amountInfo.increase = $scope.amountInfo.total - bak;
                }
            }, function (data) {
                alert("服务器异常：获取虚拟机信息失败！");
            });
    }

    function getProjectInfo(cate) {
        if ($scope.selectedProjects.length > 0) {
            var project = $scope.selectedProjects[0];
            if (project.type === "九天") {
                if (cate === 'bg') {
                    return "http://61.153.107.108:9090/view/view.asp?id=" + project.name;
                } else if (cate = 'dl') {
                    return "http://60.174.233.229:9059/" + project.name + ".zip";
                }
            }
        }
        return "";
    }

    function IsPC() {
        var userAgentInfo = navigator.userAgent;
        var Agents = ["Android", "iPhone",
            "SymbianOS", "Windows Phone",
            "iPad", "iPod"];
        var flag = true;
        for (var v = 0; v < Agents.length; v++) {
            if (userAgentInfo.indexOf(Agents[v]) > 0) {
                flag = false;
                break;
            }
        }
        return flag;
    }

    function initEmployeeInfo() {
        if (sessionStorage.employeeNo) {
            $scope.employeeList = sessionStorage.employeeNo.split("|");
            $scope.employeeNo = $scope.employeeList[0];
            $scope.employeeListBak = angular.copy($scope.employeeList);
        }
    }

    function initNewVm() {
        $scope.newVm = {
            admin: sessionStorage.loginUser,
            sortNo: null
        };
    }

    function initNewProject() {
        $scope.newProject = {
            name: "",
            type: "九天"
        }
    }

    function removeEmployee(employee) {
        $scope.employeeListBak = $scope.employeeListBak.filter(function (e) {
            return e !== employee;
        });
        var employeeNo = $scope.employeeListBak.join("|");
        httpPostService.call(api.employeeNoChange, null, "admin=" + sessionStorage.loginUser + "&employeeNo=" + employeeNo)
            .then(function (data) {
                if (data !== employeeNo) {
                    alert("工号移除失败！")
                } else {
                    if (employee === $scope.employeeNo) {
                        $scope.employeeNo = null;
                    }
                    sessionStorage.employeeNo = employeeNo;
                    $scope.employeeList = angular.copy($scope.employeeListBak);
                }
            }, function () {
                alert("工号移除失败！")
            })
    }

    function selectVm(vm) {
        $scope.selectedVm = vm;
    }

    function selectProject(project) {
        $scope.selectedProject = project;
    }

    function setSelectedProject(project) {
        $scope.selectedProjects.splice(0);
        $scope.selectedProjects.push(project);
        $scope.inputCode = project.name + "-" + project.type;
    }

    function selectEmployee(employee) {
        $scope.selectedEmployee = employee;
    }

    function setSelectedEmployee(employee) {
        $scope.employeeNo = employee;
        $scope.employeeListBak = $scope.employeeListBak.filter(function (e) {
            return e !== employee;
        });
        $scope.employeeListBak.unshift(employee);
        var employeeNo = $scope.employeeListBak.join("|");
        httpPostService.call(api.employeeNoChange, null, "admin=" + sessionStorage.loginUser + "&employeeNo=" + employeeNo)
            .then(function (data) {
                if (data !== employeeNo) {
                    alert("工号更改失败！")
                } else {
                    sessionStorage.employeeNo = employeeNo;
                    closeEmployeeSelectEvent();
                }
            }, function () {
                alert("工号更改失败！")
            })
    }


    function selectProjectSearch() {
        setTimeout(function () {
            $("#projectSearch").select();
        }, 100);
    }

    function searchProject(inputCode) {
        httpPostService.call(api.projectSearch, inputCode)
            .then(function (data) {
                if (data.length > 0) {
                    $scope.projectList = angular.copy(data);
                    $scope.projectSearchShow = true;
                } else {
                    $scope.projectSearchShow = false;
                }
            }, function (data) {
                alert("服务器异常：搜索失败！");
            });
    }

    function showEmployeeSelectEvent() {
        $scope.employeeSelectShow = true;
        setTimeout(function () {
            $("#employeeSelect").select();
        }, 100);
    }

    $scope.$watch("inputCode", function (newvalue, oldvalue) {
        if (newvalue) {
            $scope.searchProject(newvalue);
        } else if (newvalue === "") {
            $scope.projectSearchShow = false;
        }
    }, true);

    $scope.$watch("employeeNo", function (newvalue, oldvalue) {
        if (newvalue) {
            if ($scope.employeeList === undefined) {
                $scope.employeeList = [];
                $scope.employeeListBak = [];
            }
            var exist = $scope.employeeList.some(function (e) {
                return e === newvalue;
            });
            if (!exist) {
                var employeeList = angular.copy($scope.employeeListBak);
                employeeList.unshift(newvalue.toString().toUpperCase());
                $scope.employeeList = employeeList;
            }
        } else if (newvalue === "") {
            $scope.employeeList = angular.copy($scope.employeeListBak);
        }
    }, true);
}

