(function(angular, _){
'use strict';

// Create local references to array methods we'll want to use later.
var array = [];
var push = array.push;
var slice = array.slice;
var splice = array.splice;

angular.module('ngCollection', ['ngResource'])
  .factory('$model', ['$resource', '$q', function($resource, $q){
    var Model = function(url, model){
      // Remove leading slash if provided
      url = (url[0] == '/') ? url.slice(1) : url;

      // Instantiate resource
      var defaultParams = (model && model.id) ? {id: model.id} : {};

      var resource = $resource('/' + url + '/:id', defaultParams, {
        // Add PUT method since it's not available by default
        update: {
          method: 'PUT'
        }
      });

      // Store the model
      this.model = model || {};

      // Expose resource promise and resolved
      this.$resolved = true;
      this.$promise = null;

      this.get = function(id){
        id = id || this.id;
        var get = resource.get({id: id});
        var that = this;

        // Update exposed promise and resolution indication
        this.$resolved = false;
        this.$promise = get.$promise;

        get.$promise.then(function(model){
          // Update model data
          _.extend(that.model, model);

          // Update resolution indicator
          that.$resolved = true;
        });

        return this;
      };

      this.save = function(){
        var save = (this.model.id) ? resource.update(this.model) : resource.save(this.model);
        var that = this;

        // Update exposed promise and resolution indication
        this.$resolved = false;
        this.$promise = save.$promise;

        save.$promise.then(function(model){
          _.extend(that.model, model);

          that.resolved = true;
        });

        return this;
      };

      this.remove = this.del = function(){
        var remove = resource.remove(this.model);
        var that = this;

        // Remove model from collection if it's in one
        if (this.$collection) {
          this.$collection.models.splice(this.$collection.indexOf(this), 1);
        }

        // Update exposed promise and resolution indication
        this.$resolved = false;
        this.$promise = remove.$promise;

        remove.$promise.then(function(model){
          that.resolved = true;
        });

        return this;
      };
    };

    // Return the constructor
    return function(url, model){
      return new Model(url, model);
    };
  }])
  .factory('$collection', ['$resource', '$q', '$model', function($resource, $q, $model){
    // Collection constructor
    var Collection = function(url, defaultParams){
      // Remove leading slash if provided
      url = (url[0] == '/') ? url.slice(1) : url;

      // Instantiate resource
      var resource = $resource('/' + url + '/:id', defaultParams, {
        // Add PUT method since it's not available by default
        update: {
          method: 'PUT'
        }
      });

      // Store models for manipulation and display
      this.models = [];

      // Store length so we can look it up faster/more easily
      this.length = 0;

      // Expose resource promise and resolved
      this.$resolved = true;
      this.$promise = null;

      var updateLength = function(){
        this.length = this.models.length;
      };

      // Expose method for querying collection of models
      this.query = function(params){
        params = params || {};
        var that = this;
        var query = resource.query(params);

        this.models = [];

        // Update exposed promise and resolution indication
        this.$resolved = false;
        this.$promise = query.$promise;

        // Update models
        this.$promise.then(function(models){
          // Loop through models
          _.each(models, function(model){
            // Push new model
            that.push(model);
          });

          // Update length property
          updateLength.apply(that);

          that.$resolved = true;
        });

        return this;
      };

      // Get an individual model by id
      this.get = function(id){
        var model = _.find(this.models, {id: id});

        return model;
      };

      this.push = this.add = function(model){
        if (model && model.model) {
          var existingModel = _.find(this.models, {id: model.model.id});

          // Add the model if it doesn't exist
          if (this.indexOf(model) < 0) {
            // Add collection reference
            model.$collection = this;
            // Push it to the models
            this.models.push(model);
          }
        } else if (model) {
          // Instantiate new model
          model = $model(url, model);
          // Add this collection reference to it
          model.$collection = this;
          // Push it to the models
          this.models.push(model);
        }

        // Update length property
        updateLength.apply(this);

        return model;
      };

      // Save all models
      this.save = function(){
        var that = this;
        var defer = $q.defer();
        var counter = 0;

        // Update promise and resolved indicator
        this.$resolved = false;
        this.$promise = defer.promise;

        // Save each model individually
        _.each(this.models, function(model){
          model.save().$promise.then(function(){
            // Increment counter
            counter++;

            // If all saves have finished, resolve the promise
            if (counter === that.length) {
              that.$resolved = true;
              defer.resolve(that.models);
            }
          });
        });

        return this;
      };

      return this;
    };

    // Stolen straight from Backbone
    // NOTE - The current included methods have been selected arbitrarily based on
    // what I've actually used in my application
    var methods = ['forEach', 'each', 'map', 'find', 'pluck', 'last', 'indexOf'];

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
    return function(url, defaultParams){
      return new Collection(url, defaultParams);
    };
  }]);
})(window.angular, window._);
