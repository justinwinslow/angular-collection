(function(angular, _){
'use strict';

// Create local references to array methods we'll want to use later.
var array = [];
var push = array.push;
var slice = array.slice;
var splice = array.splice;

var Model, Collection;

angular.module('ngCollection', [])
  .directive('ngCollectionRepeat', ['$parse', '$animate', function($parse, $animate) {
    return {
      restrict: 'A',
      transclude: 'element',
      multiElement: true,
      priority: 1000,
      terminal: true,
      $$tlb: true,
      link: function($scope, $element, $attr, ctrl, $transclude){
        var expression = $attr.ngCollectionRepeat;
        var match = expression.match(/^\s*([\s\S]+?)\s+in\s+([\s\S]+?)?\s*$/);
        var modelAlias, collectionName;

        modelAlias = match[1]; // Expose model in child scope as this
        collectionName = match[2]; // Name of the collection in the scope

        // Store elements from previous run so we can destroy them
        var previousElements = [];

        $scope.$watchCollection(collectionName, function ngRepeatAction(collection){
          var previousNode = $element[0];

          // Dump existing DOM nodes
          if (previousElements.length) {
            _.each(previousElements, function(element){
              $animate.leave(element, function(){
                element = null;
              });
            });
            // Clear array
            previousElements = [];
          }

          if (collection) {
            for (var index = 0, length = collection.length; index < length; index++) {
              var model = collection.models[index];
              var childScope = $scope.$new();

              // Add model to the scope
              childScope[modelAlias] = model.attributes;

              // Add a reference to the model so you can use it in your controllers
              childScope.$this = model;

              // Add logic helpers to scope
              childScope.$index = index;
              childScope.$first = (index === 0);
              childScope.$last = (index === (collection.length - 1));
              childScope.$middle = !(childScope.$first || childScope.$last);
              // jshint bitwise: false
              childScope.$odd = !(childScope.$even = (index&1) === 0);
              // jshint bitwise: true

              // Build the DOM element
              $transclude(childScope, function(clone) {
                $animate.enter(clone, null, angular.element(previousNode));
                previousNode = clone;
                previousElements.push(clone);
              });
            }
          }
        });
      }
    };
  }])
  .factory('$model', ['$http', '$q', function($http, $q){
    Model = function(url, model){
      this.url = url || '/';

      // Instantiate resource
      var defaultParams = (model && model.id) ? {id: model.id} : {};

      // Store the model
      this.attributes = model || {};

      // Expose resource promise and resolved
      this.$resolved = true;

      // Immediately resolve a promise to use as this.$promise
      var defer = $q.defer();
      defer.resolve(this.attributes);

      this.$promise = defer.promise;

      this.get = function(id){
        id = id || this.attributes.id || '';
        var get = $http.get(this.url + '/' + id);
        var that = this;

        // Update exposed promise and resolution indication
        this.$resolved = false;
        this.$promise = get;

        get.then(function(response){
          that.update(response.data);
        });

        get.finally(function(){
          that.$resolved = true;
        });

        return this;
      };

      this.save = function(){
        var save = (this.attributes.id) ? $http.put(this.url + '/' + this.attributes.id, this.attributes) : $http.post(this.url, this.attributes);
        var that = this;

        // Update exposed promise and resolution indication
        this.$resolved = false;
        this.$promise = save;

        save.then(function(response){
          that.update(response.data);
        });

        save.finally(function(){
          that.$resolved = true;
        });

        return this;
      };

      // NOTE - it's possible we'll want to save the original attributes object
      // but I can't think of good reason at the moment and this works fine
      this.update = function(attributes) {
        var keys = _.keys(attributes);

        // Remove any keys not present in the new data
        for (var key in this.attributes) {
          if (keys.indexOf(key) < 0) {
            delete this.attributes[key];
          }
        }

        // Merge the new data into the model
        _.extend(this.attributes, attributes);
      };

      this.remove = this.del = function(){
        var remove;
        var that = this;

        if (this.attributes.id) {
          remove = $http.delete(url + '/' + this.attributes.id);
        } else {
          var defer = $q.defer();
          remove = defer.promise;
          defer.resolve();
        }

        // Update exposed promise and resolution indication
        this.$resolved = false;
        this.$promise = remove;

        remove.then(function(){
          // Remove model from collection if it's in one
          if (that.$collection) {
            that.$collection.remove(that);
          }
        });

        remove.finally(function(){
          that.$resolved = true;
        });

        return this;
      };

      this.toJSON = function(){
        return this.attributes;
      };
    };

    // Return the constructor
    return function(url, model){
      return new Model(url, model);
    };
  }])
  .factory('$collection', ['$http', '$q', '$model', function($http, $q, $model){
    // Collection constructor
    Collection = function(url, defaultParams, collection){
      this.url = url || '/';

      defaultParams = defaultParams || {};

      // Store models for manipulation and display
      this.models = [];

      // Store length so we can look it up faster/more easily
      this.length = 0;

      // Expose resource promise and resolved
      this.$resolved = true;

      // Immediately resolve a promise to use as this.$promise
      var defer = $q.defer();
      defer.resolve(this.models);

      this.$promise = defer.promise;

      var updateLength = function(){
        this.length = this.models.length;
      };

      // determines how old this data is since it returned from the server
      this.getAge = function() {
        return this.$resolved && this.resolvedAt ? new Date() - this.resolvedAt : -1;
      };

      // sets the resolvedAt time to determine the age of the data
      var setAge = function(promise) {
        var that = this;

        this.requestedAt = +new Date();

        promise.then(function () {
          that.resolvedAt = +new Date();
        });

        return this;
      };

      // Expose method for querying collection of models
      this.query = function(params){
        params = $.extend({}, defaultParams, params);
        var that = this;
        var query = $http.get(this.url, {params: params});

        // Update data age info
        setAge.call(this, query);

        // Update exposed promise and resolution indication
        this.$resolved = false;
        this.$promise = query;

        // Update models
        query.then(function(response){
          // Clear out models
          that.models.length = 0;
          that.length = 0;

          var models = response.data;
          // Loop through models
          _.each(models, function(model){
            // Push new model
            that.push(model);
          });
        });

        query.finally(function(){
          that.$resolved = true;
        });

        return this;
      };

      this.sync = function(options) {
        options = options || {};

        // If the consumer set a minimum age, let's just return
        // if the data isn't old enough
        if (options.minAge && options.minAge > this.getAge()) {
          return this;
        }

        var that = this;
        var sync = $http.get(this.url, {params: defaultParams});

        // Update data age info
        setAge.call(this, sync);

        // Update exposed promise and resolution indication
        this.$resolved = false;
        this.$promise = sync;

        // Update models
        sync.then(function(response){
          var ids = [];

          _.each(response.data, function(attributes){
            var id = attributes.id;
            var model = that.find({id: id});

            if (id) ids.push(id);

            if (model) {
              model.update(attributes);
            } else {
              that.add(attributes);
            }
          });

          // Remove any models that aren't present in the lastest data
          _.each(_.clone(that.models), function(model){
            try {
              if (ids.indexOf(model.attributes.id) < 0) {
                that.remove(model);
              }
            } catch(e) {
              throw 'Issue with model: ' + JSON.stringify(model);
            }
          });
        });

        sync.finally(function(){
          that.$resolved = true;
        });

        return this;
      };

      this.push = this.add = function(model){
        if (model instanceof Model) {
          // Add the model if it doesn't exist
          if (this.models.indexOf(model) < 0) {
            // Add collection reference
            model.$collection = this;
            // Push it to the models
            this.models.push(model);
          }
        } else if (model) {
          // Instantiate new model
          model = $model(this.url, model);
          // Add this collection reference to it
          model.$collection = this;
          // Push it to the models
          this.models.push(model);
        }

        // Update length property
        updateLength.apply(this);

        return model;
      };

      // Remove a specific model from the collection
      this.remove = function(model){
        this.models.splice(this.models.indexOf(model), 1);
        updateLength.apply(this);

        return this;
      };

      // Save all models
      this.save = function(){
        var that = this;
        var defer = $q.defer();
        var counter = 0;

        // Update promise and resolved indicator
        this.$resolved = false;
        this.$promise = defer.promise;

        if (this.length) {
          // Save each model individually
          this.each(function(model){
            model.save().then(function(){
              // Increment counter
              counter++;

              // If all saves have finished, resolve the promise
              if (counter === that.length) {
                defer.resolve(that.models);
                that.$resolved = true;
              }
            });
          });
        } else {
          // Resolve immediately if there are no models
          defer.resolve();
        }

        defer.promise.finally(function(){
          that.$resolved = true;
        });

        return this;
      };

      this.find = this.findWhere = function(attrs) {
        if (_.isFunction(attrs)) {
          return _.find(this.models, attrs);
        }

        return _.find(this.models, function(model){
          for (var key in attrs) {
            if (attrs[key] !== model.attributes[key]) return false;
          }
          return true;
        });
      };

      this.pluck = function(property){
        var values = [];

        this.each(function(model){
          if (model.attributes[property]){
            values.push(model.attributes[property]);
          }
        });

        return values;
      };

      this.at = function(index){
        return this.models[index];
      };

      this.toJSON = function(){
        var models = [];
        this.each(function(model){
          models.push(model.toJSON());
        });
        return models;
      };

      // If a collection has been supplied, let's use that
      if (collection && collection.length) {
        // Loop through models
        _.each(collection, function(model){
          // Push new model
          this.push(model);
        }, this);
      }
    };

    // Stolen straight from Backbone
    var methods = ['each', 'filter', 'first', 'forEach', 'indexOf', 'last', 'map', 'some'];

    _.each(methods, function(method) {
      Collection.prototype[method] = function() {
        // Slice returns arguments as an array
        var args = slice.call(arguments);
        // Add the models as the first value in args
        args.unshift(this.models);
        // Return the _ method with appropriate context and arguments
        return _[method].apply(_, args);
      };
    });

    // Return the constructor
    return function(url, defaultParams, collection){
      return new Collection(url, defaultParams, collection);
    };
  }]);
})(window.angular, window._);
