/*
 * # Semantic - State
 * http://github.com/jlukic/semantic-ui/
 *
 *
 * Copyright 2013 Contributors
 * Released under the MIT license
 * http://opensource.org/licenses/MIT
 *
 */

;(function ( $, window, document, undefined ) {

$.fn.state = function(parameters) {
  var
    $allModules     = $(this),
    settings        = $.extend(true, {}, $.fn.state.settings, parameters),

    moduleSelector  = $allModules.selector || '',

    time            = new Date().getTime(),
    performance     = [],

    query           = arguments[0],
    methodInvoked   = (typeof query == 'string'),
    queryArguments  = [].slice.call(arguments, 1),

    // shortcuts
    error         = settings.error,
    metadata      = settings.metadata,
    className     = settings.className,
    namespace     = settings.namespace,
    selector      = settings.selector,
    states        = settings.states,
    text          = settings.text,

    eventNamespace  = '.' + namespace,
    moduleNamespace = namespace + '-module',


    returnedValue
  ;
  $allModules
    .each(function() {
      var
        $module       = $(this),
        $text         = ( $module.find(selector.text).size() > 0 )
          ? $module.find(selector.text)
          : $module,

        element       = this,
        instance      = $module.data(moduleNamespace),

        module
      ;
      module = {

        initialize: function() {
          module.verbose('Initializing module');

          // allow module to guess desired state based on element
          if(settings.automatic) {
            module.add.defaults();
          }

          if( module.allows('hover') ) {
            $module
              .on('mouseenter' + eventNamespace, module.enable.hover)
              .on('mouseleave' + eventNamespace, module.disable.hover)
            ;
          }
          if( module.allows('down') ) {
            $module
              .on('mousedown' + eventNamespace, module.enable.down)
              .on('mouseup'   + eventNamespace, module.disable.down)
            ;
          }
          if( module.allows('focus') ) {
            $module
              .on('focus' + eventNamespace, module.enable.focus)
              .on('blur'  + eventNamespace, module.disable.focus)
            ;
          }
          $module
            .on('mouseenter' + eventNamespace, module.change.text)
            .on('mouseleave' + eventNamespace, module.reset.text)
            .on('click'      + eventNamespace, module.toggle.state)
          ;

          module.instantiate();
        },

        instantiate: function() {
          module.verbose('Storing instance of module', module);
          instance = module;
          $module
            .data(moduleNamespace, module)
          ;
        },

        destroy: function() {
          module.verbose('Destroying previous module', instance);
          $module
            .off(eventNamespace)
            .removeData(moduleNamespace)
          ;
        },

        refresh: function() {
          module.verbose('Refreshing selector cache');
          $module = $(element);
        },

        add: {
          defaults: function() {
            var
              userStates = parameters && $.isPlainObject(parameters.states)
                ? parameters.states
                : {}
            ;
            $.each(settings.defaults, function(type, typeStates) {
              if( module.is[type] !== undefined && module.is[type]() ) {
                module.verbose('Adding default states', type, element);
                $.extend(settings.states, typeStates, userStates);
              }
            });
          }
        },

        is: {

          active: function() {
            return $module.hasClass(className.active);
          },
          loading: function() {
            return $module.hasClass(className.loading);
          },
          inactive: function() {
            return !( $module.hasClass(className.active) );
          },

          enabled: function() {
            return !( $module.is(settings.filter.active) );
          },
          disabled: function() {
            return ( $module.is(settings.filter.active) );
          },
          textEnabled: function() {
            return !( $module.is(settings.filter.text) );
          },

          // definitions for automatic type detection
          button: function() {
            return $module.is('.button:not(a, .submit)');
          },
          input: function() {
            return $module.is('input');
          }
        },

        allow: function(state) {
          module.debug('Now allowing state', state);
          states[state] = true;
        },
        disallow: function(state) {
          module.debug('No longer allowing', state);
          states[state] = false;
        },

        allows: function(state) {
          return states[state] || false;
        },

        enable: {
          state: function(state) {
            if(module.allows(state)) {
              $module.addClass( className[state] );
            }
          },
          // convenience
          focus: function() {
            $module.addClass(className.focus);
          },
          hover: function() {
            $module.addClass(className.hover);
          },
          down: function() {
            $module.addClass(className.down);
          },
        },

        disable: {
          state: function(state) {
            if(module.allows(state)) {
              $module.removeClass( className[state] );
            }
          },
          // convenience
          focus: function() {
            $module.removeClass(className.focus);
          },
          hover: function() {
            $module.removeClass(className.hover);
          },
          down: function() {
            $module.removeClass(className.down);
          },
        },

        toggle: {
          state: function() {
            if( module.allows('active') && module.is.enabled() ) {
              module.refresh();
              if($.fn.api !== undefined && $module.api('get xhr') !== undefined) {
                module.listenTo($module.api('get request'));
              }
              else {
                module.change.state();
              }
            }
          }
        },

        listenTo: function(apiRequest) {
          module.debug('API request detected, waiting for state signal', apiRequest);
          if(apiRequest) {
            if(text.loading) {
              module.update.text(text.loading);
            }
            $.when(apiRequest)
              .then(function() {
                if(apiRequest.state() == 'resolved') {
                  module.debug('API request succeeded');
                  settings.activateTest   = function(){ return true; };
                  settings.deactivateTest = function(){ return true; };
                }
                else {
                  module.debug('API request failed');
                  settings.activateTest   = function(){ return false; };
                  settings.deactivateTest = function(){ return false; };
                }
                module.change.state();
              })
            ;
          }
        },

        // checks whether active/inactive state can be given
        change: {

          state: function() {
            module.debug('Determining state change direction');
            // inactive to active change
            if( module.is.inactive() ) {
              module.activate();
            }
            else {
              module.deactivate();
            }
            if(settings.sync) {
              module.sync();
            }
            $.proxy(settings.onChange, element)();
          },

          text: function() {
            if( module.is.textEnabled() ) {
              if( module.is.active() ) {
                if(text.hover) {
                  module.verbose('Changing text to hover text', text.hover);
                  module.update.text(text.hover);
                }
                else if(text.deactivate) {
                  module.verbose('Changing text to disable text', text.deactivate);
                  module.update.text(text.deactivate);
                }
              }
              else {
                if(text.hover) {
                  module.verbose('Changing text to hover text', text.deactivate);
                  module.update.text(text.hover);
                }
                else if(text.activate){
                  module.verbose('Changing text to enable text', text.activate);
                  module.update.text(text.activate);
                }
              }
            }
          }

        },

        activate: function() {
          if( $.proxy(settings.activateTest, element)() ) {
            module.debug('Setting state to active');
            $module
              .addClass(className.active)
            ;
            module.update.text(text.active);
          }
          $.proxy(settings.onActivate, element)();
        },

        deactivate: function() {
          if($.proxy(settings.deactivateTest, element)() ) {
            module.debug('Setting state to inactive');
            $module
              .removeClass(className.active)
            ;
            module.update.text(text.inactive);
          }
          $.proxy(settings.onDeactivate, element)();
        },

        sync: function() {
          module.verbose('Syncing other buttons to current state');
          if( module.is.active() ) {
            $allModules
              .not($module)
                .state('activate');
          }
          else {
            $allModules
              .not($module)
                .state('deactivate')
            ;
          }
        },

        get: {
          text: function() {
            $text.text();
          },
          textFor: function(state) {
            return text[state] || false;
          }
        },

        flash: {
          text: function(text, duration) {
            var
              previousText = module.get.text()
            ;
            module.debug('Flashing text message', text, duration);
            text     = text     || settings.text.flash;
            duration = duration || settings.flashDuration;
            module.update.text(text);
            setTimeout(function(){
              module.update.text(previousText);
            }, duration);
          }
        },

        reset: {
          // on mouseout sets text to previous value
          text: function() {
            var
              activeText   = text.active   || $module.data(metadata.storedText),
              inactiveText = text.inactive || $module.data(metadata.storedText)
            ;
            if( module.is.textEnabled() ) {
              if( module.is.active() && activeText) {
                module.verbose('Resetting active text', activeText);
                module.update.text(activeText);
              }
              else if(inactiveText) {
                module.verbose('Resetting inactive text', activeText);
                module.update.text(inactiveText);
              }
            }
          }
        },

        update: {
          text: function(text) {
            var
              currentText = module.get.text()
            ;
            if(text && text !== currentText) {
              module.debug('Updating text', $text, text);
              $text
                .data(metadata.storedText, text)
              ;
              if( $module.find(selector.text).size() > 0 ) {
                $text
                  .text(text)
                ;
              }
              else {
                $text
                  .html(text)
                ;
              }
            }
            else {
              module.debug('Text is already same, ignoring update', text);
            }
          }
        },

        setting: function(name, value) {
          module.debug('Changing setting', name, value);
          if(value !== undefined) {
            if( $.isPlainObject(name) ) {
              $.extend(true, settings, name);
            }
            else {
              settings[name] = value;
            }
          }
          else {
            return settings[name];
          }
        },
        internal: function(name, value) {
          module.debug('Changing internal', name, value);
          if(value !== undefined) {
            if( $.isPlainObject(name) ) {
              $.extend(true, module, name);
            }
            else {
              module[name] = value;
            }
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

$.fn.state.settings = {

  // module info
  name : 'State',

  // debug output
  debug      : true,

  // verbose debug output
  verbose    : true,

  // namespace for events
  namespace  : 'state',

  // debug data includes performance
  performance: true,

  // callback occurs on state change
  onActivate   : function() {},
  onDeactivate : function() {},
  onChange     : function() {},

  // state test functions
  activateTest   : function() { return true; },
  deactivateTest : function() { return true; },

  // whether to automatically map default states
  automatic     : true,

  // activate / deactivate changes all elements instantiated at same time
  sync          : false,

  // default flash text duration, used for temporarily changing text of an element
  flashDuration : 3000,

  // selector filter
  filter     : {
    text   : '.loading, .disabled',
    active : '.disabled'
  },

  // error
  error: {
    method : 'The method you called is not defined.'
  },

  // metadata
  metadata: {
    promise    : 'promise',
    storedText : 'stored-text'
  },

  // change class on state
  className: {
    active  : 'active',
    down    : 'down',
    focus   : 'focus',
    hover   : 'hover',
    loading : 'loading'
  },

  selector: {
    // selector for text node
    text: '.text'
  },

  defaults : {
    input: {
      hover   : false,
      focus   : false,
      down    : false,
      loading : true,
      active  : true
    },
    button: {
      hover   : false,
      focus   : false,
      down    : false,
      active  : true,
      loading : true
    }
  },

  states     : {
    hover   : true,
    focus   : true,
    down    : true,
    loading : false,
    active  : false
  },

  text     : {
    activate   : false,
    active     : false,
    deactivate : false,
    inactive   : false,
    flash      : false,
    hover      : false
  }

};



})( jQuery, window , document );
