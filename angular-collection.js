(function(angular, _){
'use strict';

angular.module('ngCollection', ['ngResource'])
  .factory('$collection', ['$resource', '$q', function($resource, $q){
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

      // Expose resource promise and resolved
      this.$resolved = true;
      this.$promise = null;

      // Expose method for querying collection of models
      this.query = function(params){
        params = params || {};
        var that = this;
        var query = resource.query(params);

        // Update exposed promise and resolution indication
        this.$resolved = false;
        this.$promise = query.$promise;

        // Update models
        this.$promise.then(function(response){
          // Loop through models
          _.each(response, function(model){
            var existingModel = _.find(that.models, {id: model.id});

            if (existingModel) {
              // Update existing model
              _.extend(existingModel, model);
            } else {
              // or push new model
              that.models.push(model);
            }
          });

          that.$resolved = true;
        });

        return query;
      };

      // Get an individual model
      // NOTE - When I first started building this I made the get method actually fetch a
      // resource instead of behaving like the Backbone collection get. I've since updated
      // it to try to find the model in the models array and request the resource if that
      // fails. Not sure if that is useful or smart at this point.
      this.get = function(params){
        // If a string is passed, assume it's an id
        params = (typeof params == 'string') ? {id: params} : params;

        var model = _.find(this.models, params);
        var get;

        if (model) {
          var defer = $q.defer();

          get = {
            $promise: defer.promise,
            $resolved: false
          };

          // Add model to get
          _.extend(get, model);

          // Resolve the defer immediately since the push isn't async
          defer.resolve(model);
          get.$resolved = true;
        } else {
          get = resource.get(params);
        }

        return get;
      };

      // Add model to collection without saving it
      this.add = this.push = function(model){
        var defer = $q.defer();
        var add = {
          $promise: defer.promise,
          $resolved: false
        };

        // Add the model to the returned object
        _.extend(add, model);

        // Push model to collection
        this.models.push(model);

        // Resolve the defer immediately since the push isn't async
        defer.resolve(model);
        add.$resolved = true;

        return add;
      };

      // Save a new model
      this.save = function(model){
        var that = this;
        var save;

        if (model.id) {
          save = resource.update({id: model.id}, model);

          _.extend(_.find(this.models, {id: model.id}), model);
        } else {
          save = resource.save(model);

          save.$promise.then(function(model){
            // Add model to collection
            that.models.push(model);
          });
        }

        return save;
      };

      // Delete existing model
      this.remove = this.del = function(model){
        var remove;

        // If the model has an id we need to del it from the database
        if (model.id) {
          remove = resource.remove({id: model.id});
        } else {
          var defer = $q.defer();
          remove = {
            $promise: defer.promise,
            $resolved: false
          };

          // Add the model to the returned object
          _.extend(remove, model);

          // Resolve defer immediately since we don't have to hit the database
          defer.resolve(model);
          remove.resolved = true;
        }

        // Remove model from collection
        _.remove(this.models, model);

        return remove;
      };

      return this;
    };

    // Return the constructor
    return function(url, defaultParams){
      return new Collection(url, defaultParams);
    };
  }]);
})(window.angular, window._);
