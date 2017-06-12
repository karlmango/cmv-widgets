/*eslint strict: 0, no-loop-func: 0  */
define([
    'dojo/_base/declare',
    'dijit/_WidgetBase',
    'dijit/_TemplatedMixin',
    'dijit/_WidgetsInTemplateMixin',

    'dojo/_base/lang',
    'dojo/on',
    'dojo/dom-style',
    'dojo/aspect',
    'dojo/topic',
    'dojo/keys',
    'dojo/_base/array',
    'dojo/dom',
    'dojo/dom-construct',
    'dijit/registry',
    'dojo/io-query',

    'dijit/form/Select',
    'dijit/form/TextBox',
    'dijit/form/SimpleTextarea',
    'dijit/form/DateTextBox',
    'dijit/form/TimeTextBox',
    'dijit/form/NumberTextBox',
    'dijit/form/CurrencyTextBox',
    'dijit/form/NumberSpinner',

    'esri/toolbars/draw',
    'esri/tasks/query',
    'esri/tasks/GeometryService',
    'esri/geometry/geometryEngine',

    'esri/layers/GraphicsLayer',
    'esri/graphic',
    'esri/symbols/SimpleMarkerSymbol',
    'esri/symbols/SimpleLineSymbol',
    'esri/symbols/SimpleFillSymbol',

    './Search/GetDistinctValues',

    // template
    'dojo/text!./Search/templates/Search.html',

    //i18n
    'dojo/i18n!./Search/nls/Search',

    //template widgets
    'dijit/layout/LayoutContainer',
    'dijit/layout/ContentPane',
    'dijit/layout/TabContainer',
    'dijit/form/Button',
    'dijit/form/CheckBox',
    'dijit/form/ToggleButton',

    // css
    'xstyle/css!./Search/css/Search.css',
    'xstyle/css!./Search/css/Draw.css'

], function (
    declare,
    _WidgetBase,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,

    lang,
    on,
    domStyle,
    aspect,
    topic,
    keys,
    arrayUtil,
    dom,
    domConstruct,
    registry,
    ioQuery,

    Select,
    TextBox,
    SimpleTextarea,
    DateTextBox,
    TimeTextBox,
    NumberTextBox,
    CurrencyTextBox,
    NumberSpinner,

    Draw,
    Query,
    GeometryService,
    geometryEngine,
    GraphicsLayer,
    Graphic,
    SimpleMarkerSymbol,
    SimpleLineSymbol,
    SimpleFillSymbol,

    GetDistinctValues,

    template,

    i18n
) {

    return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
        name: 'Search',
        baseClass: 'cmvSearchWidget',
        widgetsInTemplate: true,
        templateString: template,
        mapClickMode: null,

        // i18n
        defaultI18n: i18n,
        i18n: {},

        title: 'Search Results',
        topicID: 'searchResults',
        attributesContainerID: 'attributesContainer',
        queryBuilderTopicID: 'queryBuilderWidget',

        shapeLayer: 0,
        attributeLayer: 0,
        drawToolbar: null,

        // to override the default tab when the widget starts
        defaultTab: 0,

        defaultBufferDistance: 0,

        /*
            To hide specific tabs.
            This is an zero-based array so [1] would hide the second tab.
            It is an array to anticipate more than 2 tabs in a future release.
        */
        hiddenTabs: [],

        // collects the geometry from multiple shapes for use in the search
        spatialGeometry: null,

        // the current tab/table of search results
        selectedTable: null,

        /*
            Search capabilities that can be enabled/disabled
            individually in the configuration file.
        */
        enableQueryBuilder: false, //Query Builder widget not yet released
        enableDrawMultipleShapes: true,
        enableAddToExistingResults: true,
        enableSpatialFilters: true,

        // configure which spatial filters are available
        spatialFilters: {
            entireMap: true,
            currentExtent: true,
            identifiedFeature: true,
            searchFeatures: true,
            searchSelected: true,
            searchSource: true,
            searchBuffer: true
        },

        drawingOptions: {
            rectangle: true,
            circle: true,
            point: true,
            polyline: true,
            freehandPolyline: true,
            polygon: true,
            freehandPolygon: true,
            stopDrawing: true,
            identifiedFeature: true,
            selectedFeatures: true,

            symbols: {}
        },

        defaultQueryStringOptions: {
            // what parameter is used to pass the layer index
            layerParameter: 'layer',

            // what parameter is used to pass the attribute search index
            searchParameter: 'search',

            // what parameter is used to pass the values to be searched
            valueParameter: 'values',

            // if passing multiple values, how are they delimited
            valueDelimiter: '|',

            // Should the widget open when the search is executed?
            openWidget: true
        },

        // symbology for drawn shapes
        defaultSymbols: {
            point: {
                type: 'esriSMS',
                style: 'esriSMSCircle',
                size: 6,
                color: [0, 0, 0, 64],
                angle: 0,
                xoffset: 0,
                yoffset: 0,
                outline: {
                    type: 'esriSLS',
                    style: 'esriSLSSolid',
                    color: [255, 0, 0],
                    width: 2
                }
            },
            polyline: {
                type: 'esriSLS',
                style: 'esriSLSSolid',
                color: [255, 0, 0],
                width: 2
            },
            polygon: {
                type: 'esriSFS',
                style: 'esriSFSSolid',
                color: [0, 0, 0, 64],
                outline: {
                    type: 'esriSLS',
                    style: 'esriSLSSolid',
                    color: [255, 0, 0],
                    width: 1
                }
            },

            // symbology for buffer around shapes
            buffer: {
                type: 'esriSFS',
                style: 'esriSFSSolid',
                color: [255, 0, 0, 32],
                outline: {
                    type: 'esriSLS',
                    style: 'esriSLSDash',
                    color: [255, 0, 0, 255],
                    width: 1
                }
            }
        },

        bufferUnits: [
            {
                value: GeometryService.UNIT_FOOT,
                label: 'Feet',
                selected: true
            },
            {
                value: GeometryService.UNIT_STATUTE_MILE,
                label: 'Miles'
            },
            {
                value: GeometryService.UNIT_METER,
                label: 'Meters'
            },
            {
                value: GeometryService.UNIT_KILOMETER,
                label: 'Kilometers'
            },
            {
                value: GeometryService.UNIT_NAUTICAL_MILE,
                label: 'Nautical Miles'
            },
            {
                value: GeometryService.UNIT_US_NAUTICAL_MILE,
                label: 'US Nautical Miles'
            }
        ],

        postMixInProperties: function () {
            this.inherited(arguments);
            this.i18n = this.mixinDeep(this.defaultI18n, this.i18n);
        },

        postCreate: function () {
            this.inherited(arguments);
            this.initAdvancedFeatures();
            this.initLayerSelect();
            this.initSpatialFilters();
            this.inputBufferDistance.set('value', this.defaultBufferDistance || 0);
            this.selectBufferUnits.set('options', this.bufferUnits);
            this.drawToolbar = new Draw(this.map);
            this.enableDrawingButtons();
            this.addGraphicsLayer();

            this.tabContainer.watch('selectedChildWidget', lang.hitch(this, function () {
                this.stopDrawing();
            }));

            if (this.map.infoWindow) {
                on(this.map.infoWindow, 'show', lang.hitch(this, 'enableIdentifyButton'));
                on(this.map.infoWindow, 'hide', lang.hitch(this, 'disableIdentifyButton'));
            }
            this.own(on(this.drawToolbar, 'draw-end', lang.hitch(this, 'endDrawing')));

            this.addTopics();
        },

        startup: function () {
            this.inherited(arguments);

            this.buildSearchControls();

            if (this.getParent) {
                var parent = this.getParent();
                if (parent) {
                    this.own(on(parent, 'show', lang.hitch(this, function () {
                        this.tabContainer.resize();
                    })));
                }
            }
            aspect.after(this, 'resize', lang.hitch(this, function () {
                this.tabContainer.resize();
            }));

            this.tabChildren = this.tabContainer.getChildren();
            if (this.defaultTab !== null) {
                var defTab = this.tabChildren[this.defaultTab];
                if (defTab) {
                    this.tabContainer.selectChild(defTab);
                }
            }

            var k = 0, len = this.hiddenTabs.length;
            for (k = 0; k < len; k++) {
                var tab = this.tabChildren[this.hiddenTabs[k]];
                domStyle.set(tab.domNode, 'display', 'none');
                domStyle.set(tab.controlButton.domNode, 'display', 'none');
            }

            // Search from the applications query string
            this.checkQueryString();
        },

        addTopics: function () {
            this.own(topic.subscribe('mapClickMode/currentSet', lang.hitch(this, 'setMapClickMode')));
            this.own(topic.subscribe(this.topicID + '/search', lang.hitch(this, 'executeSearch')));
            this.own(topic.subscribe(this.attributesContainerID + '/tableUpdated', lang.hitch(this, 'setSearchTable')));

            // used with QueryBuilder widget
            this.own(topic.subscribe(this.topicID + '/setSQLWhereClause', lang.hitch(this, 'setSQLWhereClause')));
            this.own(topic.subscribe(this.topicID + '/clearSQLWhereClause', lang.hitch(this, 'clearSQLWhereClause')));
        },

        /*******************************
        *  Search Functions
        *******************************/

        executeSearchWithReturn: function (evt) {
            if (evt.keyCode === keys.ENTER) {
                this.doAttributeSearch();
            }
        },

        search: function (geometry, layerIndex) {
            if (!this.layers || this.layers.length === 0) {
                return;
            }

            var layer = this.layers[layerIndex];
            var search = layer.attributeSearches[this.searchIndex] || {};
            var searchOptions = this.buildSearchOptions(layer, search);
            if (layer.findOptions) { // It is a FindTask
                searchOptions.findOptions = this.buildFindOptions(layer, search);
            } else {
                searchOptions.queryOptions = this.buildQueryOptions(layer, search, geometry);
            }

            this.hideInfoWindow();

            // publish to an accompanying attributed table
            if (searchOptions.findOptions || searchOptions.queryOptions) {
                topic.publish(this.attributesContainerID + '/addTable', searchOptions);
            }

        },

        buildSearchOptions: function (layer, search) {
            var gridOptions = lang.clone(search.gridOptions || layer.gridOptions || {});
            var featureOptions = lang.clone(search.featureOptions || layer.featureOptions || {});
            var symbolOptions = lang.clone(search.symbolOptions || layer.symbolOptions || {});
            var toolbarOptions = lang.clone(search.toolbarOptions || layer.toolbarOptions || {});
            var infoTemplates = lang.clone(search.infoTemplates || layer.infoTemplates || {});

            return {
                title: search.title || layer.title || this.title,
                topicID: search.topicID || layer.topicID || this.topicID,
                findOptions: null,
                queryOptions: null,
                gridOptions: gridOptions,
                featureOptions: featureOptions,
                symbolOptions: symbolOptions,
                toolbarOptions: toolbarOptions,
                infoTemplates: infoTemplates
            };
        },

        buildQueryOptions: function (layer, search, geometry) {
            var where, distance, unit, showOnly = false, addToExisting = false;
            var queryOptions = {
                idProperty: search.idProperty || layer.idProperty || 'FID',
                linkField: search.linkField || layer.linkField || null,
                linkedQuery: lang.clone(search.linkedQuery || layer.linkedQuery || null)
            };

            if (geometry) {
                distance = this.inputBufferDistance.get('value');
                if (isNaN(distance)) {
                    topic.publish('growler/growl', {
                        title: 'Search',
                        message: 'Invalid distance',
                        level: 'error',
                        timeout: 3000
                    });
                    return null;
                }
                unit = this.selectBufferUnits.get('value');
                showOnly = this.checkBufferOnly.get('checked');
                addToExisting = this.checkSpatialAddToExisting.get('checked');

            } else {
                where = this.buildWhereClause(layer, search);
                if (where === null) {
                    return null;
                }
                geometry = this.getSpatialFilterGeometry();
                addToExisting = this.checkAttributeAddToExisting.get('checked');
            }

            var queryParameters = lang.clone(search.queryParameters || layer.queryParameters || {});
            queryOptions.queryParameters = lang.mixin(queryParameters, {
                //type: search.type || layer.type || 'spatial',
                geometry: this.geometryToJson(geometry),
                where: where,
                addToExisting: addToExisting,
                outSpatialReference: search.outSpatialReference || this.map.spatialReference,
                spatialRelationship: search.spatialRelationship || layer.spatialRelationship || Query.SPATIAL_REL_INTERSECTS
            });

            var bufferParameters = lang.clone(search.bufferParameters || layer.bufferParameters || {});
            queryOptions.bufferParameters = lang.mixin(bufferParameters, {
                distance: distance,
                unit: unit,
                showOnly: showOnly
            });

            return queryOptions;

        },

        buildFindOptions: function (layer, search) {
            var searchTerm = null;
            if (search.searchFields.length > 0) {
                var inputId = search.inputIds[0];
                var input = registry.byId(inputId);
                searchTerm = this.getSearchTerm(input, search.searchFields[0]);
                if (searchTerm === null) {
                    return null;
                }
            }
            return lang.mixin(layer.findOptions, {
                searchText: searchTerm,
                contains: !this.containsSearchText.checked,
                outSpatialReference: search.outSpatialReference || this.map.spatialReference
            });
        },

        buildWhereClause: function (layer, search) {
            var where = layer.expression || '';
            var fields = search.searchFields;
            var searchTerm = null;

            if (search.expression) {
                if (where !== '') {
                    where += ' AND ';
                }
                where += '(' + search.expression + ')';
            }

            var len = fields.length;
            for (var k = 0; k < len; k++) {
                var field = fields[k];
                var inputId = search.inputIds[k];
                var input = registry.byId(inputId);

                if (field.where) {
                    if (where !== '') {
                        where += ' AND ';
                    }
                    where += '(' + field.where + ')';
                }

                searchTerm = this.getSearchTerm(input, field);
                if (searchTerm === null) {
                    return null;
                } else if (searchTerm.length > 0 && field.expression) {
                    var attrWhere = field.expression;
                    attrWhere = attrWhere.replace(/\[value\]/g, searchTerm);
                    if (!attrWhere) {
                        break;
                    }
                    if (where !== '') {
                        where += ' AND ';
                    }
                    where += attrWhere;
                }
            }
            if (where.length === 0) {
                where = '1=1';
            }

            return where;
        },

        getSpatialFilterGeometry: function () {
            var geometry = null, type = this.selectAttributeSpatialFilter.get('value');

            switch (type) {
            case 'entireMap':
                break;
            case 'currentExtent':
                geometry = this.map.extent;
                break;
            case 'identifiedFeatures':
                geometry = this.getGeometryFromIdentifiedFeature();
                break;
            case 'searchSource':
                if (this.selectedTable) {
                    geometry = this.getGeometryFromGraphicsLayer(this.selectedTable.sourceGraphics);
                }
                break;
            case 'searchFeatures':
                if (this.selectedTable) {
                    geometry = this.getGeometryFromGraphicsLayer(this.selectedTable.featureGraphics);
                }
                break;
            case 'searchSelected':
                if (this.selectedTable) {
                    geometry = this.getGeometryFromSelectedFeatures();
                }
                break;
            case 'searchBuffer':
                if (this.selectedTable) {
                    geometry = this.getGeometryFromGraphicsLayer(this.selectedTable.bufferGraphics);
                }
                break;
            default:
                break;
            }

            return geometry;
        },

        getGeometryFromGraphicsLayer: function (layer) {
            if (!layer || !layer.graphics) {
                return null;
            }

            var graphics = layer.graphics;
            var k = 0, len = graphics.length, geoms = [];
            for (k = 0; k < len; k++) {
                geoms.push(graphics[k].geometry);
            }
            return geometryEngine.union(geoms);
        },

        getGeometryFromIdentifiedFeature: function () {
            var popup = this.map.infoWindow, feature;
            if (popup && popup.isShowing) {
                feature = popup.getSelectedFeature();
            }
            return feature.geometry;
        },

        getGeometryFromSelectedFeatures: function () {
            var geom;
            if (this.selectedTable) {
                geom = this.getGeometryFromGraphicsLayer(this.selectedTable.selectedGraphics);
            }
            return geom;
        },

        getSearchTerm: function (input, field) {
            if (input.isValid && !input.isValid()) {
                topic.publish('growler/growl', {
                    title: 'Search',
                    message: 'Invalid value for ' + field.name + '.',
                    level: 'error',
                    timeout: 3000
                });
                return null;
            }

            var value = input.get('value'), searchTerm = '';
            switch (field.type) {
            case 'date':
            case 'time':
            case 'number':
            case 'currency':
            case 'numberspinner':
                value = input.toString();
                if (field.format) {
                    searchTerm = input.format(value);
                } else {
                    searchTerm = value;
                }
                break;

            default:
                if (lang.isArray(value)) {
                    searchTerm = value.join('\', \'');
                }
                searchTerm = value;
                if (searchTerm === '*' || searchTerm === null) {
                    searchTerm = '';
                }
                break;
            }

            if (searchTerm === '' && field.required) {
                input.domNode.focus();

                topic.publish('growler/growl', {
                    title: 'Search',
                    message: 'You must provide a search term for ' + field.name + '.',
                    level: 'error',
                    timeout: 3000
                });
                return null;
            }
            if (field.minChars && field.required) {
                if (searchTerm.length < field.minChars) {
                    input.domNode.focus();
                    topic.publish('growler/growl', {
                        title: 'Search',
                        message: 'Search term for ' + field.name + ' must be at least ' + field.minChars + ' characters.',
                        level: 'error',
                        timeout: 3000
                    });
                    return null;
                }
            }

            return searchTerm;
        },

        // a topic subscription to listen for published topics
        // also used to search from the queryString
        executeSearch: function (options) {
            if (options.bufferDistance) {
                this.inputBufferDistance.set('value', options.bufferDistance);
                if (options.bufferUnits) {
                    this.selectBufferUnits.set('value', options.bufferUnits);
                }
            }

            //attribute search
            var doAttrSearch = false;
            if (options.searchTerm) {
                var inputId, input;
                var layer = this.layers[options.layerIndex];
                if (layer) {
                    this.attributeLayer = options.layerIndex;
                    this.onAttributeLayerChange(this.attributeLayer);
                    var search = layer.attributeSearches[options.searchIndex];
                    if (search) {
                        this.onAttributeQueryChange(options.searchIndex);
                        if (lang.isArray(options.searchTerm)) {
                            var len = options.searchTerm.length;
                            for (var k = 0; k < len; k++) {
                                inputId = search.inputIds[k];
                                if (inputId) {
                                    input = registry.byId(inputId);
                                    if (input) {
                                        input.set('value', options.searchTerm[k]);
                                        doAttrSearch = true;
                                    }
                                }
                            }
                        } else {
                            inputId = search.inputIds[0];
                            input = registry.byId(inputId);
                            if (input) {
                                input.set('value', options.searchTerm);
                                doAttrSearch = true;
                            }
                        }
                    }
                }
            }
            if (options.geometry || doAttrSearch) {
                this.search(options.geometry, options.layerIndex);
            }
        },

        checkQueryString: function () {
            // searching by geometry from the query string is not yet supported
            var options = this.mixinDeep(this.defaultQueryStringOptions, this.queryStringOptions || {});
            var uri = window.location.href;
            var qs = uri.substring(uri.indexOf('?') + 1, uri.length);
            var qsObj = ioQuery.queryToObject(qs);
            var value = qsObj[options.valueParameter];
            var layerIndex = qsObj[options.layerParameter] || 0;
            var searchIndex = qsObj[options.searchParameter] || 0;
            var widget;

            // only continue if there is a term to search
            if (!value) {
                return;
            }
            if (value.indexOf(options.valueDelimiter) > -1) {
                value = value.split(options.valueDelimiter);
            }

            if (options.openWidget) {
                widget = this.parentWidget;
                if (widget && widget.toggleable) {
                    if (!widget.open) {
                        widget.toggle();
                    }
                }
            }

            // make sure the attributesTable widget is loaded before executing
            // check every 0.25 seconds
            var qsTimer = window.setInterval(lang.hitch(this, function () {
                widget = registry.byId(this.attributesContainerID + '_widget');
                if (widget) {
                    // no need to continue, so clear the timer
                    window.clearInterval(qsTimer);

                    // we're ready so execute the search.
                    this.executeSearch({
                        layerIndex: layerIndex,
                        searchIndex: searchIndex,
                        searchTerm: value
                    });
                }
            }), 250);

            // clear the timer after 30 seconds in case we are waiting that long
            window.setTimeout(function () {
                window.clearInterval(qsTimer);
            }, 30000);
        },

        /*******************************
        *  Form/Field Functions
        *******************************/

        // Initialize the controls used for the search.
        buildSearchControls: function () {
            // change to
            var domNode = this.divAttributeQueryFields;
            if (domNode) {
                for (var i = 0; i < this.layers.length; i++) {
                    var layer = this.layers[i];
                    if (layer) {
                        var searches = layer.attributeSearches;
                        if (searches) {
                            for (var j = 0; j < searches.length; j++) {
                                var search = searches[j];
                                if (search) {
                                    var firstSearch = ((i === 0) && (j === 0));
                                    // add the div for the search
                                    var id = '_' + i.toString() + '_' + j.toString();
                                    var divName = 'divSearch' + id;
                                    var divNode = domConstruct.create('div', {
                                        id: divName,
                                        style: {
                                            display: 'none'
                                        }
                                    }, domNode, 'last');
                                    // display the first search for the first layer
                                    if (firstSearch) {
                                        domStyle.set(divName, 'display', 'block');
                                    }
                                    search.divName = divName;
                                    search.inputIds = [];

                                    // add the controls for the search
                                    for (var k = 0; k < search.searchFields.length; k++) {
                                        this.buildSearchControl(search, layer, divNode, id, k, firstSearch);
                                    }
                                    //this.initialized = true;
                                }
                            }
                        }
                    }
                }
            }
        },

        buildSearchControl: function (search, layer, divNode, id, k, firstSearch) {
            var field = search.searchFields[k];
            var inputId = 'inputSearch_' + id + '_' + k.toString();

            if (field) {
                var fieldNode = domConstruct.create('div', {
                    className: 'searchField'
                }, divNode, 'last');

                this.buildSearchControlLabel(field, search, layer, fieldNode);

                if (field.unique || field.values) {
                    this.buildSearchControlSelect(field, search, layer, fieldNode, inputId, firstSearch);
                } else {
                    this.buildSearchControlInput(field, search, layer, fieldNode, inputId);
                }

                // the first input field is for focus
                search.inputIds.push(inputId);
            }

        },

        buildSearchControlLabel: function (field, search, layer, fieldNode) {
            var labelWidth = field.labelWidth || layer.labelWidth || null;
            if (typeof(labelWidth) === 'number') {
                labelWidth += 'px';
            }

            var txt = field.label + ':';
            var title = field.label;
            if (field.minChars) {
                title = 'Enter at least ' + field.minChars + ' characters';
            }

            domConstruct.create('div', {
                innerHTML: txt,
                className: 'searchFieldLabel',
                title: title,
                style: {
                    width: labelWidth
                }

            }, fieldNode, 'last');

        },

        buildSearchControlSelect: function (field, search, layer, fieldNode, inputId, firstSearch) {
            var input,
                style = field.style || layer.style || null,
                fieldWidth = field.width || layer.fieldWidth || '99%',
                fieldHeight = field.height || layer.fieldHeight || 'inherit',
                options = [];

            if (typeof(fieldWidth) === 'number') {
                fieldWidth += 'px';
            }
            if (typeof(fieldHeight) === 'number') {
                fieldHeight += 'px';
            }

            if (field.values) {
                arrayUtil.forEach(field.values, function (item) {
                    if (typeof(item) === 'string') {
                        options.push({
                            label: item,
                            value: item,
                            selected: false
                        });
                    } else {
                        options.push(item);
                    }
                });
                if (options.length > 0) {
                    options[0].selected = true;
                }
            }

            input = new Select({
                id: inputId,
                options: options,
                style: style || {
                    height: fieldHeight,
                    width: fieldWidth
                }
            });

            if (input) {
                input.placeAt(fieldNode, 'last');
            }

            // only do this for the first search for the first layer
            if (field.type === 'unique' && firstSearch) {
                var queryParameters = lang.clone(layer.queryParameters);
                queryParameters.url = field.url || layer.queryParameters.url;
                var where = this.getWhereClauseForDistinctValues(field, search, layer);
                this.getDistinctValues(inputId, queryParameters, field.name, field.includeBlankValue, where);
            }
        },

        buildSearchControlInput: function (field, search, layer, fieldNode, inputId) {
            var input,
                style = field.style || layer.style || null,
                fieldWidth = field.width || layer.fieldWidth || '99%',
                fieldHeight = field.height || layer.fieldHeight || 'inherit';

            if (typeof(fieldWidth) === 'number') {
                fieldWidth += 'px';
            }
            if (typeof(fieldHeight) === 'number') {
                fieldHeight += 'px';
            }

            var options = {
                id: inputId,
                constraints: field.constraints || {},
                value: field.defaultValue,
                placeHolder: field.placeholder,
                style: style || {
                    height: fieldHeight,
                    width: fieldWidth
                }
            };

            switch (field.type) {
            case 'date':
                input = new DateTextBox(options);
                break;
            case 'time':
                input = new TimeTextBox(options);
                break;
            case 'number':
                input = new NumberTextBox(options);
                break;
            case 'currency':
                input = new CurrencyTextBox(options);
                break;
            case 'numberspinner':
                options.smallDelta = field.smallDelta || 1;
                input = new NumberSpinner(options);
                break;
            case 'textarea':
                input = new SimpleTextarea(options);
                break;
            default:
                input = new TextBox(options);
                break;
            }

            if (input) {
                input.placeAt(fieldNode, 'last');
                this.own(on(input, 'keyup', lang.hitch(this, 'executeSearchWithReturn')));
            }
        },

        initLayerSelect: function () {
            var attrOptions = [],
                shapeOptions = [];
            var len = this.layers.length,
                option;
            for (var i = 0; i < len; i++) {
                option = {
                    value: i,
                    label: this.layers[i].name
                };
                attrOptions.push(lang.clone(option));
                if (this.layers[i].queryParameters && this.layers[i].queryParameters.type === 'spatial') {
                    option.value = (shapeOptions.length);
                    shapeOptions.push(option);
                }
            }

            if (attrOptions.length > 0) {
                this.selectLayerByAttribute.set('options', attrOptions);
                this.onAttributeLayerChange(this.attributeLayer);
            } else {
                this.selectLayerByAttribute.set('disabled', true);
            }
            if (shapeOptions.length > 0) {
                this.selectLayerByShape.set('options', shapeOptions);
                this.onShapeLayerChange(this.shapeLayer);
            } else {
                this.selectLayerByShape.set('disabled', true);
            }
        },

        initAdvancedFeatures: function () {
            // show the queryBuilder button
            if (this.enableQueryBuilder) {
                this.btnQueryBuilder.set('disabled', false);
            } else {
                domStyle.set(this.btnQueryBuilder.domNode, 'display', 'none');
            }

            // allow or not the drawing multiple shapes before searching
            if (!this.enableDrawMultipleShapes) {
                domStyle.set(this.btnSpatialSearch.domNode, 'display', 'none');
                this.drawingOptions.stopDrawing = false;
            }

            // allow or the search results to be added to the previous results
            if (!this.enableAddToExistingResults) {
                domStyle.set(this.divAttributeAddToExisting, 'display', 'none');
                domStyle.set(this.divSpatialAddToExisting, 'display', 'none');
                this.drawingOptions.selectedFeatures = false;
            }

            // allow or not the use of spatial features
            if (!this.enableSpatialFilters) {
                domStyle.set(this.divAttributeSpatialFilter, 'display', 'none');
            }
        },

        onShapeLayerChange: function (newValue) {
            this.shapeLayer = newValue;
        },

        onAttributeLayerChange: function (newValue) {
            this.attributeLayer = newValue;
            this.selectAttributeQuery.set('disabled', true);
            var layer = this.layers[this.attributeLayer];
            if (layer) {
                this.selectAttributeQuery.set('value', null);
                this.selectAttributeQuery.set('options', null);
                var searches = layer.attributeSearches;
                var options = [];
                var len = searches.length;
                for (var i = 0; i < len; i++) {
                    var option = {
                        value: i,
                        label: searches[i].name
                    };
                    options.push(option);
                    if (i === 0) {
                        options[i].selected = true;
                    }
                }
                if (len) {
                    this.selectAttributeQuery.set('options', options);
                    this.selectAttributeQuery.set('disabled', false);
                    this.selectAttributeQuery.set('value', 0);
                    this.onAttributeQueryChange(0);

                    domStyle.set(this.divAttributeQuerySelect, 'display', (len > 1) ? 'block' : 'none');
                }
            }
        },

        onAttributeQueryChange: function (newValue) {
            // 'none' all of the query divs
            var domNode = this.divAttributeQueryFields,
                searches, search, layer, divNode;
            if (domNode) {
                for (var i = 0; i < this.layers.length; i++) {
                    layer = this.layers[i];
                    if (layer) {
                        searches = layer.attributeSearches;
                        if (searches) {
                            for (var j = 0; j < searches.length; j++) {
                                search = searches[j];
                                divNode = dom.byId(search.divName);
                                if (divNode) {
                                    domStyle.set(search.divName, 'display', 'none');
                                }
                            }
                        }
                    }
                }
            }

            // 'block' the query div and set the focus to the first widget
            this.searchIndex = newValue;
            layer = this.layers[this.attributeLayer];
            if (layer) {
                searches = layer.attributeSearches;
                if (searches) {
                    search = searches[newValue];
                    if (search) {
                        divNode = dom.byId(search.divName);
                        if (!divNode) {
                            return;
                        }
                        // refresh the controls if any require unique values
                        for (var k = 0; k < search.searchFields.length; k++) {
                            var field = search.searchFields[k];
                            if (field.unique) {
                                var queryParameters = lang.clone(layer.queryParameters);
                                queryParameters.url = field.url || layer.queryParameters.url;
                                var where = this.getWhereClauseForDistinctValues(field, search, layer);
                                this.getDistinctValues(search.inputIds[k], queryParameters, field.name, field.includeBlankValue, where);
                            }
                        }
                        domStyle.set(search.divName, 'display', 'block');

                        // only show "Contains" checkbox for FindTasks
                        domStyle.set(this.queryContainsDom, 'display', ((layer.findOptions) ? 'block' : 'none'));

                        // put focus on the first input field
                        var input = registry.byId(search.inputIds[0]);
                        if (input && input.domNode) {
                            input.domNode.focus();
                            this.btnAttributeSearch.set('disabled', false);
                        }
                    }
                }
            }
        },

        getWhereClauseForDistinctValues: function (field, search, layer) {
            var where = layer.expression || '';
            if (search.expression) {
                if (where !== '') {
                    where += ' AND ';
                }
                where += '(' + search.expression + ')';
            }
            if (field.where) {
                if (where !== '') {
                    where += ' AND ';
                }
                where += '(' + field.where + ')';
            }
            return where;
        },

        /*
         * Retrieve the list of distinct values from ArcGIS Server using the ArcGIS API for JavaScript.
         * @param {string} inputId The Dojo id of the control to populate with unique values.
         * @param {object} queryParameters Used to get the operational layer's url to be queried for unique values.
         * @param {string} fieldName The field name for which to retrieve unique values.
         * @param {boolean} includeBlankValue Whether to add a blank (null) value to the resulting list.
         */
        getDistinctValues: function (inputId, queryParameters, fieldName, includeBlankValue, where) {
            var url = this.getLayerURL(queryParameters);
            if (url) {
                var q = new GetDistinctValues(inputId, url, fieldName, includeBlankValue, where);
                q.executeQuery();
            }
        },

        getLayerURL: function (qp) {
            var url = qp.url;
            if (!url && qp.layerID) {
                var layer = this.map.getLayer(qp.layerID);
                if (layer) {
                    if (layer.declaredClass === 'esri.layers.FeatureLayer') { // Feature Layer
                        url = layer.url;
                    } else if (layer.declaredClass === 'esri.layers.ArcGISDynamicMapServiceLayer') { // Dynamic Layer
                        if (qp.sublayerID !== null) {
                            url = layer.url + '/' + qp.sublayerID;
                        } else if (layer.visibleLayers && layer.visibleLayers.length === 1) {
                            url = layer.url + '/' + layer.visibleLayers[0];
                        }
                    }
                }
            }
            return url;
        },

        doAttributeSearch: function () {
            this.search(null, this.attributeLayer);
        },

        initSpatialFilters: function () {
            var type = this.selectAttributeSpatialFilter.get('value');
            var geomOptions = [], popup = this.map.infoWindow, includeOption;
            for (var key in this.spatialFilters) {
                if (this.spatialFilters.hasOwnProperty(key)) {
                    if (this.spatialFilters[key]) {
                        includeOption = false;
                        switch (key) {
                        case 'identifiedFeature':
                            if (popup && popup.isShowing) {
                                includeOption = true;
                            }
                            break;
                        case 'searchSource':
                            if (this.selectedTable && this.selectedTable.sourceGraphics.graphics.length > 0) {
                                includeOption = true;
                            }
                            break;
                        case 'searchFeatures':
                            if (this.selectedTable && this.selectedTable.featureGraphics.graphics.length > 0) {
                                includeOption = true;
                            }
                            break;
                        case 'searchSelected':
                            if (this.selectedTable && this.selectedTable.selectedGraphics.graphics.length > 0) {
                                includeOption = true;
                            }
                            break;
                        case 'searchBuffer':
                            if (this.selectedTable && this.selectedTable.bufferGraphics.graphics.length > 0) {
                                includeOption = true;
                            }
                            break;
                        default:
                            includeOption = true;
                            break;
                        }
                        if (includeOption) {
                            geomOptions.push({
                                value: key,
                                label: this.i18n.Labels.spatialFilters[key]
                            });
                        }
                    }
                }
            }

            this.selectAttributeSpatialFilter.set('options', geomOptions);
            this.selectGeometry = null;
            if (geomOptions.length > 0) {
                this.selectAttributeSpatialFilter.set('disabled', false);
                this.selectAttributeSpatialFilter.set('value', type);
            } else {
                this.selectAttributeSpatialFilter.set('disabled', true);
            }
        },

        onSpatialBufferChange: function () {
            this.addBufferGraphic();
        },

        /*******************************
        *  Drawing Functions
        *******************************/

        enableDrawingButtons: function () {
            var opts = this.drawingOptions;
            var disp = (opts.rectangle !== false) ? 'inline-block' : 'none';
            domStyle.set(this.searchRectangleButtonDijit.domNode, 'display', disp);
            disp = (opts.circle !== false) ? 'inline-block' : 'none';
            domStyle.set(this.searchCircleButtonDijit.domNode, 'display', disp);
            disp = (opts.point !== false) ? 'inline-block' : 'none';
            domStyle.set(this.searchPointButtonDijit.domNode, 'display', disp);
            disp = (opts.polyline !== false) ? 'inline-block' : 'none';
            domStyle.set(this.searchPolylineButtonDijit.domNode, 'display', disp);
            disp = (opts.freehandPolyline !== false) ? 'inline-block' : 'none';
            domStyle.set(this.searchFreehandPolylineButtonDijit.domNode, 'display', disp);
            disp = (opts.polygon !== false) ? 'inline-block' : 'none';
            domStyle.set(this.searchPolygonButtonDijit.domNode, 'display', disp);
            disp = (opts.freehandPolygon !== false) ? 'inline-block' : 'none';
            domStyle.set(this.searchFreehandPolygonButtonDijit.domNode, 'display', disp);
            disp = (opts.stopDrawing !== false) ? 'inline-block' : 'none';
            domStyle.set(this.searchStopDrawingButtonDijit.domNode, 'display', disp);
            disp = (opts.identifiedFeature !== false) ? 'inline-block' : 'none';
            domStyle.set(this.searchIdentifyButtonDijit.domNode, 'display', disp);
            disp = (opts.selectedFeatures !== false) ? 'inline-block' : 'none';
            domStyle.set(this.searchSelectedButtonDijit.domNode, 'display', disp);
        },

        prepareForDrawing: function (btn) {
            // is btn checked?
            var chk = btn.get('checked');
            this.cancelDrawing();
            if (chk) {
                // toggle btn to checked state
                btn.set('checked', true);
            }
            return chk;
        },

        drawRectangle: function () {
            var btn = this.searchRectangleButtonDijit;
            if (this.prepareForDrawing(btn)) {
                this.drawToolbar.activate(Draw.EXTENT);
            }
        },

        drawCircle: function () {
            var btn = this.searchCircleButtonDijit;
            if (this.prepareForDrawing(btn)) {
                this.drawToolbar.activate(Draw.CIRCLE);
            }
        },

        drawPoint: function () {
            var btn = this.searchPointButtonDijit;
            if (this.prepareForDrawing(btn)) {
                this.drawToolbar.activate(Draw.POINT);
            }
        },

        drawPolyline: function () {
            var btn = this.searchPolylineButtonDijit;
            if (this.prepareForDrawing(btn)) {
                this.drawToolbar.activate(Draw.POLYLINE);
            }
        },

        drawFreehandPolyline: function () {
            var btn = this.searchFreehandPolylineButtonDijit;
            if (this.prepareForDrawing(btn)) {
                this.drawToolbar.activate(Draw.FREEHAND_POLYLINE);
            }
        },

        drawPolygon: function () {
            var btn = this.searchPolygonButtonDijit;
            if (this.prepareForDrawing(btn)) {
                this.drawToolbar.activate(Draw.POLYGON);
            }
        },

        drawFreehandPolygon: function () {
            var btn = this.searchFreehandPolygonButtonDijit;
            if (this.prepareForDrawing(btn)) {
                this.drawToolbar.activate(Draw.FREEHAND_POLYGON);
            }
        },

        uncheckDrawingTools: function () {
            this.searchRectangleButtonDijit.set('checked', false);
            this.searchCircleButtonDijit.set('checked', false);
            this.searchPointButtonDijit.set('checked', false);
            this.searchPolylineButtonDijit.set('checked', false);
            this.searchFreehandPolylineButtonDijit.set('checked', false);
            this.searchPolygonButtonDijit.set('checked', false);
            this.searchFreehandPolygonButtonDijit.set('checked', false);
            this.searchStopDrawingButtonDijit.set('checked', true);
            this.searchStopDrawingButtonDijit.set('disabled', true);
            this.btnSpatialSearch.set('disabled', true);
        },

        endDrawing: function (evt) {
            var clickMode = this.mapClickMode, geometry;
            if (clickMode === 'search' && evt) {
                geometry = evt.geometry;
            }
            if (geometry) {
                if (this.spatialGeometry) {
                    this.spatialGeometry = geometryEngine.union(this.spatialGeometry, geometry);
                } else {
                    this.spatialGeometry = geometry;
                }
                this.addDrawingGraphic(evt);
                this.addBufferGraphic();

                if (this.enableDrawMultipleShapes) {
                    this.btnSpatialSearch.set('disabled', false);
                    this.searchStopDrawingButtonDijit.set('disabled', false);
                } else {
                    this.doSpatialSearch();
                }
            }
        },

        stopDrawing: function () {
            this.cancelDrawing();
            this.connectMapClick();
        },

        cancelDrawing: function () {
            this.hideInfoWindow();
            this.disconnectMapClick();
            this.uncheckDrawingTools();
            this.drawToolbar.deactivate();
            this.spatialGeometry = null;
            this.drawingGraphicsLayer.clear();
            this.bufferGraphic = null;
        },

        doSpatialSearch: function () {
            this.uncheckDrawingTools();
            this.map.enableMapNavigation();
            this.drawToolbar.deactivate();
            this.drawingGraphicsLayer.clear();
            this.bufferGraphic = null;
            this.connectMapClick();

            if (this.spatialGeometry) {
                this.search(this.spatialGeometry, this.shapeLayer);
                this.spatialGeometry = null;
            }
        },

        addGraphicsLayer: function () {
            this.drawingGraphicsLayer = new GraphicsLayer({
                id: this.topicID + '_SourceGraphics',
                title: 'Search Drawing Graphics'
            });
            this.map.addLayer(this.drawingGraphicsLayer);

            // symbology for drawn features
            var symbolOptions = this.drawingOptions.symbols || {};
            var symbols = this.mixinDeep(lang.clone(this.defaultSymbols), symbolOptions);
            this.drawingPointSymbol = new SimpleMarkerSymbol(symbols.point);
            this.drawingPolylineSymbol = new SimpleLineSymbol(symbols.polyline);
            this.drawingPolygonSymbol = new SimpleFillSymbol(symbols.polygon);
            this.bufferPolygonSymbol = new SimpleFillSymbol(symbols.buffer);
        },

        addDrawingGraphic: function (feature) {
            var symbol, graphic;
            switch (feature.geometry.type) {
            case 'point':
            case 'multipoint':
                symbol = this.drawingPointSymbol;
                break;
            case 'polyline':
                symbol = this.drawingPolylineSymbol;
                break;
            case 'extent':
            case 'polygon':
                symbol = this.drawingPolygonSymbol;
                break;
            default:
            }
            if (symbol) {
                graphic = new Graphic(feature.geometry, symbol, feature.attributes);
                this.drawingGraphicsLayer.add(graphic);
            }
        },

        addBufferGraphic: function () {
            var geometry,
                distance = this.inputBufferDistance.get('value'),
                unit = this.selectBufferUnits.get('value');

            this.drawingGraphicsLayer.remove(this.bufferGraphic);
            this.bufferGraphic = null;

            if (isNaN(distance) || distance === 0 || !this.spatialGeometry) {
                return;
            }
            if (this.map.spatialReference.wkid === 4326 || this.map.spatialReference.wkid === 102100) {
                geometry = geometryEngine.geodesicBuffer(this.spatialGeometry, distance, unit);
                if (geometry) {
                    this.bufferGraphic = new Graphic(geometry, this.bufferPolygonSymbol);
                    this.drawingGraphicsLayer.add(this.bufferGraphic);
                }
            }
        },

        /*
        onDrawToolbarDrawEnd: function (graphic) {
            this.map.enableMapNavigation();
            this.drawToolbar.deactivate();
            this.connectMapClick();

            this.search(graphic.geometry, this.shapeLayer);
        },
        */

        /*******************************
        *  Using Identify Functions
        *******************************/

        useIdentifiedFeatures: function () {
            var geometry = this.getGeometryFromIdentifiedFeature();
            if (geometry) {
                this.search(geometry, this.shapeLayer);
                return;
            }

            topic.publish('growler/growl', {
                title: 'Search',
                message: 'You must have identified a feature',
                level: 'error',
                timeout: 3000
            });
        },

        enableIdentifyButton: function () {
            this.searchIdentifyButtonDijit.set('disabled', false);
            this.initSpatialFilters();
        },

        disableIdentifyButton: function () {
            this.searchIdentifyButtonDijit.set('disabled', true);
            this.initSpatialFilters();
        },

        /*******************************
        *  Using Selected Functions
        *******************************/

        useSelectedFeatures: function () {
            var geometry = this.getGeometryFromSelectedFeatures();
            if (geometry) {
                this.search(geometry, this.shapeLayer);
                return;
            }

            topic.publish('growler/growl', {
                title: 'Search',
                message: 'You must have selected feature(s)',
                level: 'error',
                timeout: 3000
            });
        },

        toggleSelectedButton: function () {
            var geometry = this.getGeometryFromSelectedFeatures();
            if (geometry) {
                this.enableSelectedButton();
            } else {
                this.disableSelectedButton();
            }
        },

        enableSelectedButton: function () {
            this.searchSelectedButtonDijit.set('disabled', false);
        },

        disableSelectedButton: function () {
            this.searchSelectedButtonDijit.set('disabled', true);
        },

        /*******************************
        *  Query Builder Functions
        *******************************/

        openQueryBuilder: function () {
            var layer = this.layers[this.attributeLayer], search = layer.attributeSearches[this.searchIndex] || {};
            topic.publish(this.queryBuilderTopicID + '/openDialog', {
                layer: layer,
                sqlText: search.sqlWhereClause
            });
        },

        setSQLWhereClause: function (sqlText) {
            var layer = this.layers[this.attributeLayer], search = layer.attributeSearches[this.searchIndex] || {};
            search.sqlWhereClause = sqlText;
        },

        clearSQLWhereClause: function () {
            var layer = this.layers[this.attributeLayer], search = layer.attributeSearches[this.searchIndex] || {};
            search.sqlWhereClause = null;
        },

        /*******************************
        *  Miscellaneous Functions
        *******************************/

        geometryToJson: function (geom) {
            if (geom && geom.type && geom.toJson) {
                var type = geom.type;
                geom = geom.toJson();
                geom.type = type;
            }
            return geom;
        },

        hideInfoWindow: function () {
            if (this.map && this.map.infoWindow) {
                this.map.infoWindow.hide();
            }
        },

        disconnectMapClick: function () {
            topic.publish('mapClickMode/setCurrent', 'search');
        },

        connectMapClick: function () {
            topic.publish('mapClickMode/setDefault');
        },

        setMapClickMode: function (mode) {
            this.mapClickMode = mode;
        },

        onLayoutChange: function (open) {
            if (!open && this.mapClickMode === 'search') {
                this.connectMapClick();
                this.drawToolbar.deactivate();
                this.inherited(arguments);
            }
        },

        setSearchTable: function (searchTable) {
            this.selectedTable = searchTable;
            this.initSpatialFilters();
            this.toggleSelectedButton();
        },

        mixinDeep: function (dest, source) {
            //Recursively mix the properties of two objects
            var empty = {};
            for (var name in source) {
                if (!(name in dest) || (dest[name] !== source[name] && (!(name in empty) || empty[name] !== source[name]))) {
                    try {
                        if (source[name].constructor === Object) {
                            dest[name] = this.mixinDeep(dest[name], source[name]);
                        } else {
                            dest[name] = source[name];
                        }
                    } catch (e) {
                        // Property in destination object not set. Create it and set its value.
                        dest[name] = source[name];
                    }
                }
            }
            return dest;
        }
    });
});
