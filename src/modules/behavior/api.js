/*
 * # Semantic - API
 * http://github.com/jlukic/semantic-ui/
 *
 *
 * Copyright 2013 Contributors
 * Released under the MIT license
 * http://opensource.org/licenses/MIT
 *
 */

;(function ( $, window, document, undefined ) {

$.api = $.fn.api = function(parameters) {
  var
    // use window context if none specified
    $allModules     = $.isFunction(this)
        ? $(window)
        : $(this),
    moduleSelector  = $allModules.selector || '',
    time            = new Date().getTime(),
    performance     = [],

    query           = arguments[0],
    methodInvoked   = (typeof query == 'string'),
    queryArguments  = [].slice.call(arguments, 1),
    returnedValue
  ;
  $allModules
    .each(function() {
      var
        settings        = $.extend(true, {}, $.fn.api.settings, parameters),

        // internal aliases
        namespace       = settings.namespace,
        metadata        = settings.metadata,
        selector        = settings.selector,
        error           = settings.error,
        className       = settings.className,

        // define namespaces for modules
        eventNamespace  = '.' + namespace,
        moduleNamespace = 'module-' + namespace,

        // element that creates request
        $module         = $(this),
        $form           = $module.closest(selector.form),

        // context used for state
        $context        = (settings.stateContext)
          ? $(settings.stateContext)
          : $module,

        // standard module
        element         = this,
        instance        = $module.data(moduleNamespace),
        module
      ;

      module = {

        initialize: function() {
          var
            triggerEvent = module.get.event()
          ;
          if( triggerEvent ) {
            $module
              .on(triggerEvent + eventNamespace, module.request)
            ;
          }
          else {
            module.request();
          }
          module.instantiate();
        },

        instantiate: function() {
          module.verbose('Storing instance of module', module);
          instance = module;
          $module
            .data(moduleNamespace, instance)
          ;
        },

        destroy: function() {
          module.verbose('Destroying previous module for', element);
          $module
            .removeData(moduleNamespace)
            .off(eventNamespace)
          ;
        },

        request: function() {
          var
            requestSettings,
            promise,
            url,
            data,
            ajaxSettings   = {},
            xhr
          ;

          if(settings.serializeForm) {
            $.extend(true, settings.data, module.get.formData());
          }

          // call beforesend and get any settings changes
          requestSettings = module.get.settings();

          // check for exit conditions
          if(requestSettings === false) {
            module.error(error.beforeSend);
            module.reset();
            return;
          }

          // override with url if specified
          if(settings.url) {
            module.debug('Using specified url', url);
            url = module.add.urlData( settings.url );
          }
          else {
            url = module.add.urlData( module.get.templateURL() );
            module.debug('API url resolved to', url);
          }

          // exit conditions reached from missing url parameters
          if( !url ) {
            module.error(error.missingURL);
            module.reset();
            return;
          }

          // promise handles notification on api request, so loading min. delay can occur for all notifications
          promise = module.create.promise();

          // look for params in data
          $.extend(true, ajaxSettings, settings, {
            success    : function(){},
            failure    : function(){},
            complete   : function(){},
            type       : settings.method || settings.type,
            data       : data,
            url        : url,
            beforeSend : settings.beforeXHR
          });

          if(settings.stateContext) {
            $context
              .addClass(className.loading)
            ;
          }

          module.verbose('Creating AJAX request with settings: ', ajaxSettings);
          xhr =
            $.ajax(ajaxSettings)
              .always(function() {
                // calculate if loading time was below minimum threshold
                loadingDelay = ( settings.loadingDuration - (new Date().getTime() - time) );
                settings.loadingDelay = loadingDelay < 0
                  ? 0
                  : loadingDelay
                ;
              })
              .done(function(response) {
                var
                  context = this
                ;
                setTimeout(function(){
                  promise.resolveWith(context, [response]);
                }, settings.loadingDelay);
              })
              .fail(function(xhr, status, httpMessage) {
                var
                  context = this
                ;
                // page triggers abort on navigation, dont show error
                if(status != 'abort') {
                  setTimeout(function(){
                    promise.rejectWith(context, [xhr, status, httpMessage]);
                  }, settings.loadingDelay);
                }
                else {
                  $context
                    .removeClass(className.error)
                    .removeClass(className.loading)
                  ;
                }
              })
          ;
          if(settings.stateContext) {
            $module
              .data(metadata.promise, promise)
              .data(metadata.xhr, xhr)
            ;
          }
        },

        add: {
          urlData: function(url, urlData) {
            var
              urlVariables
            ;
            if(url) {
              urlVariables = url.match(settings.regExpTemplate);
              urlData      = urlData || settings.urlData;

              if(urlVariables) {
                module.debug('Looking for URL variables', urlVariables);
                $.each(urlVariables, function(index, templateValue){
                  var
                    term      = templateValue.substr( 2, templateValue.length - 3),
                    termValue = ($.isPlainObject(urlData) && urlData[term] !== undefined)
                      ? urlData[term]
                      : ($module.data(term) !== undefined)
                        ? $module.data(term)
                        : urlData[term]
                  ;
                  module.verbose('Looking for variable', term);
                  // remove optional value
                  if(termValue === false) {
                    module.debug('Removing variable from URL', urlVariables);
                    url = url.replace('/' + templateValue, '');
                  }
                  // undefined condition
                  else if(termValue === undefined || !termValue) {
                    module.error(error.missingParameter, term);
                    url = false;
                    return false;
                  }
                  else {
                    url = url.replace(templateValue, termValue);
                  }
                });
              }
            }
            return url;
          }
        },

        promise: {
          complete: function() {
            if(settings.stateContext) {
              $context
                .removeClass(className.loading)
              ;
            }
            $.proxy(settings.complete, $module)();
          },
          done: function(response) {
            module.debug('API request successful');
            // take a stab at finding success state if json
            if(settings.dataType == 'json') {
              if (response.error !== undefined) {
                $.proxy(settings.failure, $context)(response.error, settings, $module);
              }
              else if ($.isArray(response.errors)) {
                $.proxy(settings.failure, $context)(response.errors[0], settings, $module);
              }
              else {
                $.proxy(settings.success, $context)(response, settings, $module);
              }
            }
            // otherwise
            else {
              $.proxy(settings.success, $context)(response, settings, $module);
            }
          },
          error: function(xhr, status, httpMessage) {
            var
              errorMessage = (settings.error[status] !== undefined)
                ? settings.error[status]
                : httpMessage,
              response
            ;
            // let em know unless request aborted
            if(xhr !== undefined) {
              // readyState 4 = done, anything less is not really sent
              if(xhr.readyState !== undefined && xhr.readyState == 4) {

                // if http status code returned and json returned error, look for it
                if( xhr.status != 200 && httpMessage !== undefined && httpMessage !== '') {
                  module.error(error.statusMessage + httpMessage);
                }
                else {
                  if(status == 'error' && settings.dataType == 'json') {
                    try {
                      response = $.parseJSON(xhr.responseText);
                      if(response && response.error !== undefined) {
                        errorMessage = response.error;
                      }
                    }
                    catch(er) {
                      module.error(error.JSONParse);
                    }
                  }
                }
                $context
                  .removeClass(className.loading)
                  .addClass(className.error)
                ;
                // show error state only for duration specified in settings
                if(settings.errorDuration > 0) {
                  setTimeout(function(){
                    $context
                      .removeClass(className.error)
                    ;
                  }, settings.errorDuration);
                }
                module.debug('API Request error:', errorMessage);
                $.proxy(settings.failure, $context)(errorMessage, settings, this);
              }
              else {
                module.debug('Request Aborted (Most likely caused by page change)');
              }
            }
          }
        },

        create: {

          promise: function() {

            return $.Deferred()
              .always(module.promise.complete)
              .done(module.promise.done)
              .fail(module.promise.error)
            ;
          }

        },

        get: {
          event: function() {
            if( $.isWindow(element) ) {
              module.debug('API called without element, no events attached');
              return false;
            }
            else if(settings.on == 'auto') {
              if( $module.is('input') ) {
                return (element.oninput !== undefined)
                  ? 'input'
                  : (element.onpropertychange !== undefined)
                    ? 'propertychange'
                    : 'keyup'
                ;
              }
              else {
                return 'click';
              }
            }
            else {
              return settings.on;
            }
          },
          formData: function() {
            var
              formData
            ;
            if( $(this).toJSON() === undefined ) {
              module.error(error.missingSerialize);
              return;
            }
            formData = $form.toJSON();
            module.debug('Retrieving form data', formData);
            return $form.toJSON();
          },
          settings: function() {
            return $.proxy(settings.beforeSend, $module)(settings);
          },
          templateURL: function(action) {
            var
              url
            ;
            action = action || $module.data(settings.metadata.action) || settings.action || false;
            if(action) {
              module.debug('Looking up url for action', action);
              if(settings.api[action] !== undefined) {
                url = settings.api[action];
                module.debug('Found template url', url);
              }
              else {
                module.error(error.missingAction);
              }
            }
            return url;
          }
        },

        // reset api request
        reset: function() {
          $module
            .data(metadata.promise, false)
            .data(metadata.xhr, false)
          ;
          $context
            .removeClass(className.error)
            .removeClass(className.loading)
          ;
        },

        setting: function(name, value) {
          if( $.isPlainObject(name) ) {
            $.extend(true, settings, name);
          }
          else if(value !== undefined) {
            settings[name] = value;
          }
          else {
            return settings[name];
          }
        },
        internal: function(name, value) {
          if( $.isPlainObject(name) ) {
            $.extend(true, module, name);
          }
          else if(value !== undefined) {
            module[name] = value;
          }
          else {
            return module[name];
          }
        },
        debug: function() {
          if(settings.debug) {
            if(settings.performance) {
              module.performance.log(arguments);
            }
            else {
              module.debug = Function.prototype.bind.call(console.info, console, settings.name + ':');
              module.debug.apply(console, arguments);
            }
          }
        },
        verbose: function() {
          if(settings.verbose && settings.debug) {
            if(settings.performance) {
              module.performance.log(arguments);
            }
            else {
              module.verbose = Function.prototype.bind.call(console.info, console, settings.name + ':');
              module.verbose.apply(console, arguments);
            }
          }
        },
        error: function() {
          module.error = Function.prototype.bind.call(console.error, console, settings.name + ':');
          module.error.apply(console, arguments);
        },
        performance: {
          log: function(message) {
            var
              currentTime,
              executionTime,
              previousTime
            ;
            if(settings.performance) {
              currentTime   = new Date().getTime();
              previousTime  = time || currentTime;
              executionTime = currentTime - previousTime;
              time          = currentTime;
              performance.push({
                'Element'        : element,
                'Name'           : message[0],
                'Arguments'      : [].slice.call(message, 1) || '',
                'Execution Time' : executionTime
              });
            }
            clearTimeout(module.performance.timer);
            module.performance.timer = setTimeout(module.performance.display, 100);
          },
          display: function() {
            var
              title = settings.name + ':',
              totalTime = 0
            ;
            time = false;
            clearTimeout(module.performance.timer);
            $.each(performance, function(index, data) {
              totalTime += data['Execution Time'];
            });
            title += ' ' + totalTime + 'ms';
            if(moduleSelector) {
              title += ' \'' + moduleSelector + '\'';
            }
            if($allModules.size() > 1) {
              title += ' ' + '(' + $allModules.size() + ')';
            }
            if( (console.group !== undefined || console.table !== undefined) && performance.length > 0) {
              console.groupCollapsed(title);
              if(console.table) {
                console.table(performance);
              }
              else {
                $.each(performance, function(index, data) {
                  console.log(data['Name'] + ': ' + data['Execution Time']+'ms');
                });
              }
              console.groupEnd();
            }
            performance = [];
          }
        },
        invoke: function(query, passedArguments, context) {
          var
            maxDepth,
            found,
            response
          ;
          passedArguments = passedArguments || queryArguments;
          context         = element         || context;
          if(typeof query == 'string' && instance !== undefined) {
            query    = query.split(/[\. ]/);
            maxDepth = query.length - 1;
            $.each(query, function(depth, value) {
              var camelCaseValue = (depth != maxDepth)
                ? value + query[depth + 1].charAt(0).toUpperCase() + query[depth + 1].slice(1)
                : query
              ;
              if( $.isPlainObject( instance[value] ) && (depth != maxDepth) ) {
                instance = instance[value];
              }
              else if( $.isPlainObject( instance[camelCaseValue] ) && (depth != maxDepth) ) {
                instance = instance[camelCaseValue];
              }
              else if( instance[value] !== undefined ) {
                found = instance[value];
                return false;
              }
              else if( instance[camelCaseValue] !== undefined ) {
                found = instance[camelCaseValue];
                return false;
              }
              else {
                module.error(error.method);
                return false;
              }
            });
          }
          if ( $.isFunction( found ) ) {
            response = found.apply(context, passedArguments);
          }
          else if(found !== undefined) {
            response = found;
          }
          if($.isArray(returnedValue)) {
            returnedValue.push(response);
          }
          else if(returnedValue !== undefined) {
            returnedValue = [returnedValue, response];
          }
          else if(response !== undefined) {
            returnedValue = response;
          }
          return found;
        }
      };

      if(methodInvoked) {
        if(instance === undefined) {
          module.initialize();
        }
        module.invoke(query);
      }
      else {
        if(instance !== undefined) {
          module.destroy();
        }
        module.initialize();
      }
    })
  ;

  return (returnedValue !== undefined)
    ? returnedValue
    : this
  ;
};

$.api.settings = {

  name         : 'API',
  namespace    : 'api',

  debug        : true,
  verbose      : false,
  performance  : true,

  // event binding
  on           : 'auto',
  filter       : '.disabled, .loading',
  context      : false,
  stateContext : false,

  // templating
  action        : false,
  regExpTemplate: /\{\$([A-z]+)\}/g,

  url           : false,
  urlData       : false,
  serializeForm : false,

  // ajax
  method        : 'get',
  data          : {},
  dataType      : 'json',
  cache         : true,

  // state
  loadingDuration : 1000,
  errorDuration   : 2000,

  // callbacks
  beforeSend   : function(settings) { return settings; },
  beforeXHR    : function(xhr) {},
  success      : function(response) {},
  complete     : function(response) {},
  failure      : function(errorCode) {},

  // errors
  error : {
    beforeSend       : 'The before send function has aborted the request',
    error            : 'There was an error with your request',
    exitConditions   : 'API Request Aborted. Exit conditions met',
    JSONParse        : 'JSON could not be parsed during error handling',
    missingSerialize : 'Serializing a Form requires toJSON to be included',
    missingAction    : 'API action used but no url was defined',
    missingParameter : 'Missing an essential URL parameter: ',
    missingURL       : 'URL not specified for the API action',
    parseError       : 'There was an error parsing your request',
    statusMessage    : 'Server gave an error: ',
    timeout          : 'Your request timed out'
  },

  className: {
    loading : 'loading',
    error   : 'error'
  },

  selector: {
    form: 'form'
  },

  metadata: {
    action  : 'action',
    promise : 'promise',
    xhr     : 'xhr'
  }
};


$.api.settings.api = {};


})( jQuery, window , document );