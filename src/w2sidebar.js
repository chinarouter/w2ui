/************************************************************************
*   Library: Web 2.0 UI for jQuery (using prototypical inheritance)
*   - Following objects defined
*        - w2sidebar        - sidebar widget
*        - $().w2sidebar    - jQuery wrapper
*   - Dependencies: jQuery, w2utils
*
* == NICE TO HAVE ==
*   - add find() method to find nodes by a specific criteria (I want all nodes for exampe)
*   - dbl click should be like it is in grid (with timer not HTML dbl click event)
*   - reorder with dgrag and drop
*   - node.style is misleading - should be there to apply color for example
*   - add multiselect
*   - node.caption - deprecated
*   - node.text - can be a function
*   - node.icon - can be a function
*
* == 1.5 changes
*   - node.class - ne property
*
************************************************************************/

(function ($) {
    var w2sidebar = function (options) {
        this.name          = null;
        this.box           = null;
        this.sidebar       = null;
        this.parent        = null;
        this.nodes         = [];        // Sidebar child nodes
        this.menu          = [];
        this.routeData     = {};        // data for dynamic routes
        this.selected      = null;      // current selected node (readonly)
        this.img           = null;
        this.icon          = null;
        this.style         = '';
        this.topHTML       = '';
        this.bottomHTML    = '';
        this.flatButton    = false;
        this.keyboard      = true;
        this.flat          = false;
        this.hasFocus      = false;

        $.extend(true, this, w2obj.sidebar, options);
    };

    // ====================================================
    // -- Registers as a jQuery plugin

    $.fn.w2sidebar = function(method) {
        if ($.isPlainObject(method)) {
            // check name parameter
            if (!w2utils.checkName(method, 'w2sidebar')) return;
            // extend items
            var nodes  = method.nodes;
            var object = new w2sidebar(method);
            $.extend(object, { handlers: [], nodes: [] });
            if (nodes != null) {
                object.add(object, nodes);
            }
            if ($(this).length !== 0) {
                object.render($(this)[0]);
            }
            object.sidebar = object;
            // register new object
            w2ui[object.name] = object;
            return object;

        } else {
            var obj = w2ui[$(this).attr('name')];
            if (!obj) return null;
            if (arguments.length > 0) {
                if (obj[method]) obj[method].apply(obj, Array.prototype.slice.call(arguments, 1));
                return this;
            } else {
                return obj;
            }
        }
    };

    // ====================================================
    // -- Implementation of core functionality

    w2sidebar.prototype = {

        onClick       : null,      // Fire when user click on Node Text
        onDblClick    : null,      // Fire when user dbl clicks
        onContextMenu : null,
        onMenuClick   : null,      // when context menu item selected
        onExpand      : null,      // Fire when node Expands
        onCollapse    : null,      // Fire when node Colapses
        onKeydown     : null,
        onRender      : null,
        onRefresh     : null,
        onResize      : null,
        onDestroy     : null,
        onFocus       : null,
        onBlur        : null,
        onFlat        : null,

        node: {
            id              : null,
            text            : '',
            count           : null,
            img             : null,
            icon            : null,
            nodes           : [],
            style           : '',            // additional style for subitems
            route           : null,
            selected        : false,
            expanded        : false,
            hidden          : false,
            disabled        : false,
            group           : false,        // if true, it will build as a group
            groupShowHide   : true,
            collapsible     : false,
            plus            : false,        // if true, plus will be shown even if there is no sub nodes
            // events
            onClick         : null,
            onDblClick      : null,
            onContextMenu   : null,
            onExpand        : null,
            onCollapse      : null,
            // internal
            parent          : null,         // node object
            sidebar         : null
        },

        add: function (parent, nodes) {
            if (arguments.length == 1) {
                // need to be in reverse order
                nodes  = arguments[0];
                parent = this;
            }
            if (typeof parent == 'string') parent = this.get(parent);
            return this.insert(parent, null, nodes);
        },

        insert: function (parent, before, nodes) {
            var txt, ind, tmp, node, nd;
            if (arguments.length == 2) {
                // need to be in reverse order
                nodes  = arguments[1];
                before = arguments[0];
                if (before != null) {
                    ind = this.get(before);
                    if (ind == null) {
                        if (!$.isArray(nodes)) nodes = [nodes];
                        if (nodes[0].caption != null && nodes[0].text == null) {
                            console.log('NOTICE: sidebar node.caption property is deprecated, please use node.text. Node -> ', nodes[0]);
                            nodes[0].text = nodes[0].caption;
                        }
                        txt = nodes[0].text;
                        console.log('ERROR: Cannot insert node "'+ txt +'" because cannot find node "'+ before +'" to insert before.');
                        return null;
                    }
                    parent = this.get(before).parent;
                } else {
                    parent = this;
                }
            }
            if (typeof parent == 'string') parent = this.get(parent);
            if (!$.isArray(nodes)) nodes = [nodes];
            for (var o = 0; o < nodes.length; o++) {
                node = nodes[o];
                if (typeof node.id == null) {
                    if (node.caption != null && node.text == null) {
                        console.log('NOTICE: sidebar node.caption property is deprecated, please use node.text');
                        node.text = node.caption;
                    }
                    txt = node.text;
                    console.log('ERROR: Cannot insert node "'+ txt +'" because it has no id.');
                    continue;
                }
                if (this.get(this, node.id) != null) {
                    console.log('ERROR: Cannot insert node with id='+ node.id +' (text: '+ node.text + ') because another node with the same id already exists.');
                    continue;
                }
                tmp = $.extend({}, w2sidebar.prototype.node, node);
                tmp.sidebar = this;
                tmp.parent  = parent;
                nd = tmp.nodes || [];
                tmp.nodes = []; // very important to re-init empty nodes array
                if (before == null) { // append to the end
                    parent.nodes.push(tmp);
                } else {
                    ind = this.get(parent, before, true);
                    if (ind == null) {
                        console.log('ERROR: Cannot insert node "'+ node.text +'" because cannot find node "'+ before +'" to insert before.');
                        return null;
                }
                    parent.nodes.splice(ind, 0, tmp);
                }
                if (nd.length > 0) {
                    this.insert(tmp, null, nd);
                }
            }
            this.refresh(parent.id);
            return tmp;
        },

        remove: function () { // multiple arguments
            var deleted = 0;
            var tmp;
            for (var a = 0; a < arguments.length; a++) {
                tmp = this.get(arguments[a]);
                if (tmp == null) continue;
                if (this.selected != null && this.selected === tmp.id) {
                    this.selected = null;
                }
                var ind  = this.get(tmp.parent, arguments[a], true);
                if (ind == null) continue;
                if (tmp.parent.nodes[ind].selected) tmp.sidebar.unselect(tmp.id);
                tmp.parent.nodes.splice(ind, 1);
                deleted++;
            }
            if (deleted > 0 && arguments.length == 1) this.refresh(tmp.parent.id); else this.refresh();
            return deleted;
        },

        set: function (parent, id, node) {
            if (arguments.length == 2) {
                // need to be in reverse order
                node    = id;
                id        = parent;
                parent    = this;
            }
            // searches all nested nodes
            if (typeof parent == 'string') parent = this.get(parent);
            if (parent.nodes == null) return null;
            for (var i = 0; i < parent.nodes.length; i++) {
                if (parent.nodes[i].id === id) {
                    // make sure nodes inserted correctly
                    var nodes = node.nodes;
                    $.extend(parent.nodes[i], node, { nodes: [] });
                    if (nodes != null) {
                        this.add(parent.nodes[i], nodes);
                    }
                    this.refresh(id);
                    return true;
                } else {
                    var rv = this.set(parent.nodes[i], id, node);
                    if (rv) return true;
                }
            }
            return false;
        },

        get: function (parent, id, returnIndex) { // can be just called get(id) or get(id, true)
            if (arguments.length === 0) {
                var all = [];
                var tmp = this.find({});
                for (var t = 0; t < tmp.length; t++) {
                    if (tmp[t].id != null) all.push(tmp[t].id);
                }
                return all;
            } else {
                if (arguments.length == 1 || (arguments.length == 2 && id === true) ) {
                    // need to be in reverse order
                    returnIndex    = id;
                    id            = parent;
                    parent        = this;
                }
                // searches all nested nodes
                if (typeof parent == 'string') parent = this.get(parent);
                if (parent.nodes == null) return null;
                for (var i = 0; i < parent.nodes.length; i++) {
                    if (parent.nodes[i].id == id) {
                        if (returnIndex === true) return i; else return parent.nodes[i];
                    } else {
                        var rv = this.get(parent.nodes[i], id, returnIndex);
                        if (rv || rv === 0) return rv;
                    }
                }
                return null;
            }
        },

        find: function (parent, params, results) { // can be just called find({ selected: true })
            if (arguments.length == 1) {
                // need to be in reverse order
                params = parent;
                parent = this;
            }
            if (!results) results = [];
            // searches all nested nodes
            if (typeof parent == 'string') parent = this.get(parent);
            if (parent.nodes == null) return results;
            for (var i = 0; i < parent.nodes.length; i++) {
                var match = true;
                for (var prop in params) { // params is an object
                    if (parent.nodes[i][prop] != params[prop]) match = false;
                }
                if (match) results.push(parent.nodes[i]);
                if (parent.nodes[i].nodes.length > 0) results = this.find(parent.nodes[i], params, results);
            }
            return results;
        },

        hide: function () { // multiple arguments
            var effected = 0;
            for (var a = 0; a < arguments.length; a++) {
                var tmp = this.get(arguments[a]);
                if (tmp == null || tmp.hidden === true) continue;
                tmp.hidden = true;
                effected++;
            }
            if (effected > 0) {
                if (arguments.length == 1) this.refresh(arguments[0]); else this.refresh();
            }
            return effected;
        },

        show: function () { // multiple arguments
            var effected = 0;
            for (var a = 0; a < arguments.length; a++) {
                var tmp = this.get(arguments[a]);
                if (tmp == null || tmp.hidden === false) continue;
                tmp.hidden = false;
                effected++;
            }
            if (effected > 0) {
                if (arguments.length == 1) this.refresh(arguments[0]); else this.refresh();
            }
            return effected;
        },

        disable: function () { // multiple arguments
            var effected = 0;
            for (var a = 0; a < arguments.length; a++) {
                var tmp = this.get(arguments[a]);
                if (tmp == null || tmp.disabled === true) continue;
                tmp.disabled = true;
                if (tmp.selected) this.unselect(tmp.id);
                effected++;
            }
            if (effected > 0) {
                if (arguments.length == 1) this.refresh(arguments[0]); else this.refresh();
            }
            return effected;
        },

        enable: function () { // multiple arguments
            var effected = 0;
            for (var a = 0; a < arguments.length; a++) {
                var tmp = this.get(arguments[a]);
                if (tmp == null || tmp.disabled === false) continue;
                tmp.disabled = false;
                effected++;
            }
            if (effected > 0) {
                if (arguments.length == 1) this.refresh(arguments[0]); else this.refresh();
            }
            return effected;
        },

        select: function (id) {
            // var obj = this;
            var new_node = this.get(id);
            if (!new_node) return false;
            if (this.selected == id && new_node.selected) return false;
            this.unselect(this.selected);
            var $el = $(this.box).find('#node_'+ w2utils.escapeId(id));
            $el.addClass('w2ui-selected')
                .find('.w2ui-icon')
                .addClass('w2ui-icon-selected')
            if ($el.length > 0) {
                this.scrollIntoView(id, true)
            }
            new_node.selected = true;
            this.selected = id;
            return true;
        },

        unselect: function (id) {
            // if no arguments provided, unselect selected node
            if (arguments.length === 0) {
                id = this.selected;
            }
            var current = this.get(id);
            if (!current) return false;
            current.selected = false;
            $(this.box).find('#node_'+ w2utils.escapeId(id))
                .removeClass('w2ui-selected')
                .find('.w2ui-icon').removeClass('w2ui-icon-selected');
            if (this.selected == id) this.selected = null;
            return true;
        },

        toggle: function(id) {
            var nd = this.get(id);
            if (nd == null) return false;
            if (nd.plus) {
                this.set(id, { plus: false });
                this.expand(id);
                this.refresh(id);
                return;
            }
            if (nd.nodes.length === 0) return false;
            if (!nd.collapsible) return false;
            if (this.get(id).expanded) return this.collapse(id); else return this.expand(id);
        },

        collapse: function (id) {
            var obj = this;
            var nd  = this.get(id);
            // event before
            var edata = this.trigger({ phase: 'before', type: 'collapse', target: id, object: nd });
            if (edata.isCancelled === true) return;
            // default action
            $(this.box).find('#node_'+ w2utils.escapeId(id) +'_sub').slideUp(200);
            $(this.box).find('#node_'+ w2utils.escapeId(id) +' .w2ui-expanded').removeClass('w2ui-expanded').addClass('w2ui-collapsed')
            nd.expanded = false;
            // event after
            this.trigger($.extend(edata, { phase: 'after' }));
            setTimeout(function () { obj.refresh(id); }, 200);
            return true;
        },

        collapseAll: function (parent) {
            if (parent == null) parent = this;
            if (typeof parent == 'string') parent = this.get(parent);
            if (parent.nodes == null) return false;
            for (var i = 0; i < parent.nodes.length; i++) {
                if (parent.nodes[i].expanded === true) parent.nodes[i].expanded = false;
                if (parent.nodes[i].nodes && parent.nodes[i].nodes.length > 0) this.collapseAll(parent.nodes[i]);
            }
            this.refresh(parent.id);
            return true;
        },

        expand: function (id) {
            var obj = this;
            var nd  = this.get(id);
            // event before
            var edata = this.trigger({ phase: 'before', type: 'expand', target: id, object: nd });
            if (edata.isCancelled === true) return;
            // default action
            $(this.box).find('#node_'+ w2utils.escapeId(id) +'_sub').slideDown(200);
            $(this.box).find('#node_'+ w2utils.escapeId(id) +' .w2ui-collapsed').removeClass('w2ui-collapsed').addClass('w2ui-expanded')
            nd.expanded = true;
            // event after
            this.trigger($.extend(edata, { phase: 'after' }));
            setTimeout(function () { obj.refresh(id); }, 200);
            return true;
        },

        expandAll: function (parent) {
            if (parent == null) parent = this;
            if (typeof parent == 'string') parent = this.get(parent);
            if (parent.nodes == null) return false;
            for (var i = 0; i < parent.nodes.length; i++) {
                if (parent.nodes[i].expanded === false) parent.nodes[i].expanded = true;
                if (parent.nodes[i].nodes && parent.nodes[i].nodes.length > 0) this.expandAll(parent.nodes[i]);
            }
            this.refresh(parent.id);
        },

        expandParents: function (id) {
            var node = this.get(id);
            if (node == null) return false;
            if (node.parent) {
                if (!node.parent.expanded) {
                    node.parent.expanded = true;
                    this.refresh(node.parent.id);
                }
                this.expandParents(node.parent.id);
            }
            return true;
        },

        click: function (id, event) {
            var obj = this;
            var nd  = this.get(id);
            if (nd == null) return;
            if (nd.disabled || nd.group) return; // should click event if already selected
            // unselect all previsously
            $(obj.box).find('.w2ui-node.w2ui-selected').each(function (index, el) {
                var oldID     = $(el).attr('id').replace('node_', '');
                var oldNode = obj.get(oldID);
                if (oldNode != null) oldNode.selected = false;
                $(el).removeClass('w2ui-selected').find('.w2ui-icon').removeClass('w2ui-icon-selected');
            });
            // select new one
            var newNode = $(obj.box).find('#node_'+ w2utils.escapeId(id));
            var oldNode = $(obj.box).find('#node_'+ w2utils.escapeId(obj.selected));
            newNode.addClass('w2ui-selected').find('.w2ui-icon').addClass('w2ui-icon-selected');
            // need timeout to allow rendering
            setTimeout(function () {
                // event before
                var edata = obj.trigger({ phase: 'before', type: 'click', target: id, originalEvent: event, node: nd, object: nd });
                if (edata.isCancelled === true) {
                    // restore selection
                    newNode.removeClass('w2ui-selected').find('.w2ui-icon').removeClass('w2ui-icon-selected');
                    oldNode.addClass('w2ui-selected').find('.w2ui-icon').addClass('w2ui-icon-selected');
                    return;
                }
                // default action
                if (oldNode != null) oldNode.selected = false;
                obj.get(id).selected = true;
                obj.selected = id;
                // route processing
                if (typeof nd.route == 'string') {
                    var route = nd.route !== '' ? String('/'+ nd.route).replace(/\/{2,}/g, '/') : '';
                    var info  = w2utils.parseRoute(route);
                    if (info.keys.length > 0) {
                        for (var k = 0; k < info.keys.length; k++) {
                            if (obj.routeData[info.keys[k].name] == null) continue;
                            route = route.replace((new RegExp(':'+ info.keys[k].name, 'g')), obj.routeData[info.keys[k].name]);
                        }
                    }
                    setTimeout(function () { window.location.hash = route; }, 1);
                }
                // event after
                obj.trigger($.extend(edata, { phase: 'after' }));
            }, 1);
        },

        focus: function (event) {
            var obj = this;
            // event before
            var edata = this.trigger({ phase: 'before', type: 'focus', target: this.name, originalEvent: event });
            if (edata.isCancelled === true) return false;
            // default behaviour
            this.hasFocus = true;
            $(this.box).find('.w2ui-sidebar-body').addClass('w2ui-focus');
            setTimeout(function () {
                var $input = $(obj.box).find('#sidebar_'+ obj.name + '_focus');
                if (!$input.is(':focus')) $input.focus();
            }, 10);
            // event after
            this.trigger($.extend(edata, { phase: 'after' }));
        },

        blur: function (event) {
            // event before
            var edata = this.trigger({ phase: 'before', type: 'blur', target: this.name, originalEvent: event });
            if (edata.isCancelled === true) return false;
            // default behaviour
            this.hasFocus = false;
            $(this.box).find('.w2ui-sidebar-body').removeClass('w2ui-focus');
            // event after
            this.trigger($.extend(edata, { phase: 'after' }));
        },

        keydown: function (event) {
            var obj = this;
            var nd  = obj.get(obj.selected);
            if (obj.keyboard !== true) return;
            if (!nd) nd = obj.nodes[0];
            // trigger event
            var edata = obj.trigger({ phase: 'before', type: 'keydown', target: obj.name, originalEvent: event });
            if (edata.isCancelled === true) return;
            // default behaviour
            if (event.keyCode == 13 || event.keyCode == 32) { // enter or space
                if (nd.nodes.length > 0) obj.toggle(obj.selected);
            }
            if (event.keyCode == 37) { // left
                if (nd.nodes.length > 0 && nd.expanded) {
                    obj.collapse(obj.selected);
                } else {
                    selectNode(nd.parent);
                    if (!nd.parent.group) obj.collapse(nd.parent.id);
                }
            }
            if (event.keyCode == 39) { // right
                if ((nd.nodes.length > 0 || nd.plus) && !nd.expanded) obj.expand(obj.selected);
            }
            if (event.keyCode == 38) { // up
                if (obj.get(obj.selected) == null) {
                    selectNode(this.nodes[0] || null);
                } else {
                    selectNode(neighbor(nd, prev));
                }
            }
            if (event.keyCode == 40) { // down
                if (obj.get(obj.selected) == null) {
                    selectNode(this.nodes[0] || null);
                } else {
                    selectNode(neighbor(nd, next));
                }
            }
            // cancel event if needed
            if ($.inArray(event.keyCode, [13, 32, 37, 38, 39, 40]) != -1) {
                if (event.preventDefault) event.preventDefault();
                if (event.stopPropagation) event.stopPropagation();
            }
            // event after
            obj.trigger($.extend(edata, { phase: 'after' }));

            function selectNode (node, event) {
                if (node != null && !node.hidden && !node.disabled && !node.group) {
                    obj.click(node.id, event);
                    setTimeout(function () { obj.scrollIntoView(); }, 50);
                }
            }

            function neighbor (node, neighborFunc) {
                node = neighborFunc(node);
                while (node != null && (node.hidden || node.disabled)) {
                    if (node.group) break; else node = neighborFunc(node);
                }
                return node;
            }

            function next (node, noSubs) {
                if (node == null) return null;
                var parent   = node.parent;
                var ind      = obj.get(node.id, true);
                var nextNode = null;
                // jump inside
                if (node.expanded && node.nodes.length > 0 && noSubs !== true) {
                    var t = node.nodes[0];
                    if (t.hidden || t.disabled || t.group) nextNode = next(t); else nextNode = t;
                } else {
                    if (parent && ind + 1 < parent.nodes.length) {
                        nextNode = parent.nodes[ind + 1];
                    } else {
                        nextNode = next(parent, true); // jump to the parent
                    }
                }
                if (nextNode != null && (nextNode.hidden || nextNode.disabled || nextNode.group)) nextNode = next(nextNode);
                return nextNode;
            }

            function prev (node) {
                if (node == null) return null;
                var parent   = node.parent;
                var ind      = obj.get(node.id, true);
                var prevNode = (ind > 0) ? lastChild(parent.nodes[ind - 1]) : parent;
                if (prevNode != null && (prevNode.hidden || prevNode.disabled || prevNode.group)) prevNode = prev(prevNode);
                return prevNode;
            }

            function lastChild (node) {
                if (node.expanded && node.nodes.length > 0) {
                    var t = node.nodes[node.nodes.length - 1];
                    if (t.hidden || t.disabled || t.group) return prev(t); else return lastChild(t);
                }
                return node;
            }
        },

        scrollIntoView: function (id, instant) {
            if (id == null) id = this.selected;
            var nd = this.get(id);
            if (nd == null) return;
            var body   = $(this.box).find('.w2ui-sidebar-body');
            var item   = $(this.box).find('#node_'+ w2utils.escapeId(id));
            var offset = item.offset().top - body.offset().top;
            if (offset + item.height() > body.height() || offset <= 0) {
                body.animate({ 'scrollTop': body.scrollTop() + offset - body.height() / 2 + item.height() }, instant ? 0 : 250, 'linear');
            }
        },

        dblClick: function (id, event) {
            var nd = this.get(id);
            // event before
            var edata = this.trigger({ phase: 'before', type: 'dblClick', target: id, originalEvent: event, object: nd });
            if (edata.isCancelled === true) return;
            // default action
            this.toggle(id);
            // event after
            this.trigger($.extend(edata, { phase: 'after' }));
        },

        contextMenu: function (id, event) {
            var obj = this;
            var nd  = obj.get(id);
            if (id != obj.selected) obj.click(id);
            // event before
            var edata = obj.trigger({ phase: 'before', type: 'contextMenu', target: id, originalEvent: event, object: nd, allowOnDisabled: false });
            if (edata.isCancelled === true) return;
            // default action
            if (nd.disabled && !edata.allowOnDisabled) return;
            if (obj.menu.length > 0) {
                $(obj.box).find('#node_'+ w2utils.escapeId(id))
                    .w2menu({
                        items: obj.menu,
                        contextMenu: true,
                        originalEvent: event,
                        onSelect: function (event) {
                            obj.menuClick(id, parseInt(event.index), event.originalEvent);
                        }
                    }
                );
            }
            // cancel event
            if (event.preventDefault) event.preventDefault();
            // event after
            obj.trigger($.extend(edata, { phase: 'after' }));
        },

        menuClick: function (itemId, index, event) {
            var obj = this;
            // event before
            var edata = obj.trigger({ phase: 'before', type: 'menuClick', target: itemId, originalEvent: event, menuIndex: index, menuItem: obj.menu[index] });
            if (edata.isCancelled === true) return;
            // default action
            // -- empty
            // event after
            obj.trigger($.extend(edata, { phase: 'after' }));
        },

        goFlat: function () {
            // event before
            var edata = this.trigger({ phase: 'before', type: 'flat', goFlat: !this.flat });
            if (edata.isCancelled === true) return;
            // default action
            this.flat = !this.flat;
            this.refresh();
            // event after
            this.trigger($.extend(edata, { phase: 'after' }));
        },

        render: function (box) {
            var time = (new Date()).getTime();
            var obj  = this;
            // event before
            var edata = this.trigger({ phase: 'before', type: 'render', target: this.name, box: box });
            if (edata.isCancelled === true) return;
            // default action
            if (box != null) {
                if ($(this.box).find('> div > div.w2ui-sidebar-body').length > 0) {
                    $(this.box)
                        .removeAttr('name')
                        .removeClass('w2ui-reset w2ui-sidebar')
                        .html('');
                }
                this.box = box;
            }
            if (!this.box) return;
            $(this.box)
                .attr('name', this.name)
                .addClass('w2ui-reset w2ui-sidebar')
                .html('<div>'+
                        '<input id="sidebar_'+ this.name +'_focus" style="position: absolute; top: 0; right: 0; width: 1px; z-index: -1; opacity: 0" '+ (w2utils.isIOS ? 'readonly' : '') +'/>'+
                        '<div class="w2ui-sidebar-top"></div>' +
                        '<div class="w2ui-sidebar-body"></div>'+
                        '<div class="w2ui-sidebar-bottom"></div>'+
                    '</div>'
                );
            $(this.box).find('> div').css({
                width  : $(this.box).width() + 'px',
                height : $(this.box).height() + 'px'
            });
            if ($(this.box).length > 0) $(this.box)[0].style.cssText += this.style;
            // adjust top and bottom
            var flatHTML = '';
            if (this.flatButton == true) {
                flatHTML = '<div class="w2ui-flat-'+ (this.flat ? 'right' : 'left') +'" onclick="w2ui[\''+ this.name +'\'].goFlat()"></div>';
            }
            if (this.topHTML !== '' || flatHTML !== '') {
                $(this.box).find('.w2ui-sidebar-top').html(this.topHTML + flatHTML);
                $(this.box).find('.w2ui-sidebar-body')
                    .css('top', $(this.box).find('.w2ui-sidebar-top').height() + 'px');
            }
            if (this.bottomHTML !== '') {
                $(this.box).find('.w2ui-sidebar-bottom').html(this.bottomHTML);
                $(this.box).find('.w2ui-sidebar-body')
                    .css('bottom', $(this.box).find('.w2ui-sidebar-bottom').height() + 'px');
            }
            // focus
            var kbd_timer;
            $(this.box).find('#sidebar_'+ this.name + '_focus')
                .on('focus', function (event) {
                    clearTimeout(kbd_timer);
                    if (!obj.hasFocus) obj.focus(event);
                })
                .on('blur', function (event) {
                    kbd_timer = setTimeout(function () {
                        if (obj.hasFocus) { obj.blur(event); }
                    }, 100);
                })
                .on('keydown', function (event) {
                    if (event.keyCode != 9) { // not tab
                        w2ui[obj.name].keydown.call(w2ui[obj.name], event);
                    }
                });
            $(this.box).off('mousedown').on('mousedown', function (event) {
                // set focus to grid
                setTimeout(function () {
                    // if input then do not focus
                    if (['INPUT', 'TEXTAREA', 'SELECT'].indexOf(event.target.tagName.toUpperCase()) == -1) {
                        var $input = $(obj.box).find('#sidebar_'+ obj.name + '_focus');
                        if (!$input.is(':focus')) {
                            if ($(event.target).hasClass('w2ui-node')) {
                                var top = $(event.target).position().top + $(obj.box).find('.w2ui-sidebar-top').height() + event.offsetY;
                                $input.css({ top: top + 'px', left: '0px' });
                            }
                            $input.focus();
                        }
                    }
                }, 1);
            });
            // event after
            this.trigger($.extend(edata, { phase: 'after' }));
            // ---
            this.refresh();
            return (new Date()).getTime() - time;
        },

        refresh: function (id) {
            var time = (new Date()).getTime();
            // event before
            var edata = this.trigger({ phase: 'before', type: 'refresh', target: (id != null ? id : this.name),
                fullRefresh: (id != null ? false : true) });
            if (edata.isCancelled === true) return;
            // adjust top and bottom
            var flatHTML = '';
            if (this.flatButton == true) {
                flatHTML = '<div class="w2ui-flat-'+ (this.flat ? 'right' : 'left') +'" onclick="w2ui[\''+ this.name +'\'].goFlat()"></div>';
            }
            if (this.topHTML !== '' || flatHTML !== '') {
                $(this.box).find('.w2ui-sidebar-top').html(this.topHTML + flatHTML);
                $(this.box).find('.w2ui-sidebar-body')
                    .css('top', $(this.box).find('.w2ui-sidebar-top').height() + 'px');
            }
            if (this.bottomHTML !== '') {
                $(this.box).find('.w2ui-sidebar-bottom').html(this.bottomHTML);
                $(this.box).find('.w2ui-sidebar-body')
                    .css('bottom', $(this.box).find('.w2ui-sidebar-bottom').height() + 'px');
            }
            // default action
            $(this.box).find('> div').removeClass('w2ui-sidebar-flat').addClass(this.flat ? 'w2ui-sidebar-flat' : '').css({
                width : $(this.box).width() + 'px',
                height: $(this.box).height() + 'px'
            });
            // if no parent - reset nodes
            if (this.nodes.length > 0 && this.nodes[0].parent == null) {
                var tmp = this.nodes;
                this.nodes = [];
                this.add(this, tmp);
            }
            var obj = this;
            var node, nd;
            var nm;
            if (id == null) {
                node = this;
                nm   = '.w2ui-sidebar-body';
            } else {
                node = this.get(id);
                if (node == null) return;
                nm   = '#node_'+ w2utils.escapeId(node.id) + '_sub';
            }
            var nodeHTML;
            if (node !== this) {
                var tmp  = '#node_'+ w2utils.escapeId(node.id);
                nodeHTML = getNodeHTML(node);
                $(this.box).find(tmp).before('<div id="sidebar_'+ this.name + '_tmp"></div>');
                $(this.box).find(tmp).remove();
                $(this.box).find(nm).remove();
                $('#sidebar_'+ this.name + '_tmp').before(nodeHTML);
                $('#sidebar_'+ this.name + '_tmp').remove();
            }
            // remember scroll position
            var scroll = {
                top: $(this.box).find(nm).scrollTop(),
                left: $(this.box).find(nm).scrollLeft()
            }
            // refresh sub nodes
            $(this.box).find(nm).html('');
            for (var i = 0; i < node.nodes.length; i++) {
                nd = node.nodes[i];
                nodeHTML = getNodeHTML(nd);
                $(this.box).find(nm).append(nodeHTML);
                if (nd.nodes.length !== 0) {
                    this.refresh(nd.id);
                } else {
                    // trigger event
                    var edata2 = this.trigger({ phase: 'before', type: 'refresh', target: nd.id });
                    if (edata2.isCancelled === true) return;
                    // event after
                    this.trigger($.extend(edata2, { phase: 'after' }));
                }
            }
            // reset scroll
            $(this.box).find(nm).scrollLeft(scroll.left).scrollTop(scroll.top)
            // event after
            this.trigger($.extend(edata, { phase: 'after' }));
            return (new Date()).getTime() - time;

            function getNodeHTML(nd) {
                var html = '';
                var img  = nd.img;
                var icon = nd.icon;
                if (icon == null && img == null) {
                    if (icon == null) icon = obj.icon;
                    if (img == null) img = obj.img;
                }
                // -- find out level
                var tmp   = nd.parent;
                var level = 0;
                while (tmp && tmp.parent != null) {
                    // if (tmp.group) level--;
                    tmp = tmp.parent;
                    level++;
                }
                if (nd.caption != null && nd.text == null) nd.text = nd.caption;
                if (nd.caption != null) {
                    console.log('NOTICE: sidebar node.caption property is deprecated, please use node.text. Node -> ', nd)
                    nd.text = nd.caption;
                }
                if (Array.isArray(nd.nodes) && nd.nodes.length > 0) nd.collapsible = true
                if (nd.group) {
                    html =
                        '<div class="w2ui-node-group w2ui-level-'+ level + (nd.class ? ' ' + nd.class : '') +'" id="node_'+ nd.id +'"'+
                        '   style="'+ (nd.hidden ? 'display: none' : '') +'" onclick="w2ui[\''+ obj.name +'\'].toggle(\''+ nd.id +'\')"'+
                        '   oncontextmenu="w2ui[\''+ obj.name +'\'].contextMenu(\''+ nd.id +'\', event);"'+
                        '   onmouseout="jQuery(this).find(\'span:nth-child(1)\').css(\'color\', \'transparent\')" '+
                        '   onmouseover="jQuery(this).find(\'span:nth-child(1)\').css(\'color\', \'inherit\')">'+
                        ((nd.groupShowHide && nd.collapsible) ? '<span>'+ (!nd.hidden && nd.expanded ? w2utils.lang('Hide') : w2utils.lang('Show')) +'</span>' : '<span></span>') +
                        (typeof nd.text == 'function' ? nd.text.call(obj, nd) : '<span>'+ nd.text +'</span>') +
                        '</div>'+
                        '<div class="w2ui-node-sub" id="node_'+ nd.id +'_sub" style="'+ nd.style +';'+ (!nd.hidden && nd.expanded ? '' : 'display: none;') +'"></div>';
                    if (obj.flat) {
                        html = '<div class="w2ui-node-group" id="node_'+ nd.id +'"><span>&#160;</span></div>'+
                               '<div id="node_'+ nd.id +'_sub" style="'+ nd.style +';'+ (!nd.hidden && nd.expanded ? '' : 'display: none;') +'"></div>';
                    }
                } else {
                    if (nd.selected && !nd.disabled) obj.selected = nd.id;
                    tmp = '';
                    if (img) tmp  = '<div class="w2ui-node-image w2ui-icon '+ img + (nd.selected && !nd.disabled ? " w2ui-icon-selected" : "") +'"></div>';
                    if (icon) {
                        tmp = '<div class="w2ui-node-image"><span class="' + (typeof icon == 'function' ? icon.call(obj, nd) : icon) + '"></span></div>';
                    }
                    var text = nd.text;
                    var expand = (nd.count != null ? '<div class="w2ui-node-count">'+ nd.count +'</div>' : '');
                    if (nd.collapsible === true) {
                        expand = '<div class="w2ui-' + (nd.expanded ? 'expanded' : 'collapsed') + '"><span></span></div>';
                    }
                    if (typeof nd.text == 'function') text = nd.text.call(obj, nd);
                    html =  '<div class="w2ui-node w2ui-level-'+ level + (nd.selected ? ' w2ui-selected' : '') + (nd.disabled ? ' w2ui-disabled' : '') + (nd.class ? ' ' + nd.class : '') +'" id="node_'+ nd.id +'" style="'+ (nd.hidden ? 'display: none;' : '') +'"'+
                            '    ondblclick="w2ui[\''+ obj.name +'\'].dblClick(\''+ nd.id +'\', event);"'+
                            '    oncontextmenu="w2ui[\''+ obj.name +'\'].contextMenu(\''+ nd.id +'\', event);"'+
                            '    onClick="w2ui[\''+ obj.name +'\'].click(\''+ nd.id +'\', event); ">'+
                            '   <div class="w2ui-node-data" style="margin-left:'+ (level*12) +'px">'+
                                    tmp + expand +
                                    '<div class="w2ui-node-text w2ui-node-caption">'+ text +'</div>'+
                            '   </div>'+
                            '</div>'+
                            '<div class="w2ui-node-sub" id="node_'+ nd.id +'_sub" style="'+ nd.style +';'+ (!nd.hidden && nd.expanded ? '' : 'display: none;') +'"></div>';
                    if (obj.flat) {
                        html =  '<div class="w2ui-node w2ui-level-'+ level +' '+ (nd.selected ? 'w2ui-selected' : '') +' '+ (nd.disabled ? 'w2ui-disabled' : '') + (nd.class ? ' ' + nd.class : '') +'" id="node_'+ nd.id +'" style="'+ (nd.hidden ? 'display: none;' : '') +'"'+
                                '    onmouseover="jQuery(this).find(\'.w2ui-node-data\').w2tag(w2utils.base64decode(\''+
                                                w2utils.base64encode(text + (nd.count || nd.count === 0 ? ' - <span class="w2ui-node-count">'+ nd.count +'</span>' : '')) + '\'), '+
                                '               { id: \'' + nd.id + '\', left: -5 })"'+
                                '    onmouseout="jQuery(this).find(\'.w2ui-node-data\').w2tag(null, { id: \'' + nd.id + '\' })"'+
                                '    ondblclick="w2ui[\''+ obj.name +'\'].dblClick(\''+ nd.id +'\', event);"'+
                                '    oncontextmenu="w2ui[\''+ obj.name +'\'].contextMenu(\''+ nd.id +'\', event);"'+
                                '    onClick="w2ui[\''+ obj.name +'\'].click(\''+ nd.id +'\', event); ">'+
                                '<div class="w2ui-node-data w2ui-node-flat">'+ tmp +'</div>'+
                                '</div>'+
                                '<div class="w2ui-node-sub" id="node_'+ nd.id +'_sub" style="'+ nd.style +';'+ (!nd.hidden && nd.expanded ? '' : 'display: none;') +'"></div>';
                    }
                }
                return html;
            }
        },

        resize: function () {
            var time = (new Date()).getTime();
            // event before
            var edata = this.trigger({ phase: 'before', type: 'resize', target: this.name });
            if (edata.isCancelled === true) return;
            // default action
            $(this.box).css('overflow', 'hidden');    // container should have no overflow
            $(this.box).find('> div').css({
                width  : $(this.box).width() + 'px',
                height : $(this.box).height() + 'px'
            });
            // event after
            this.trigger($.extend(edata, { phase: 'after' }));
            return (new Date()).getTime() - time;
        },

        destroy: function () {
            // event before
            var edata = this.trigger({ phase: 'before', type: 'destroy', target: this.name });
            if (edata.isCancelled === true) return;
            // clean up
            if ($(this.box).find('> div > div.w2ui-sidebar-body').length > 0) {
                $(this.box)
                    .removeAttr('name')
                    .removeClass('w2ui-reset w2ui-sidebar')
                    .html('');
            }
            delete w2ui[this.name];
            // event after
            this.trigger($.extend(edata, { phase: 'after' }));
        },

        lock: function (msg, showSpinner) {
            var args = Array.prototype.slice.call(arguments, 0);
            args.unshift(this.box);
            w2utils.lock.apply(window, args);
        },

        unlock: function (speed) {
            w2utils.unlock(this.box, speed);
        }
    };

    $.extend(w2sidebar.prototype, w2utils.event);
    w2obj.sidebar = w2sidebar;
})(jQuery);
