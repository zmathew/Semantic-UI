/*
 * # Semantic - Transition
 * http://github.com/jlukic/semantic-ui/
 *
 *
 * Copyright 2013 Contributors
 * Released under the MIT license
 * http://opensource.org/licenses/MIT
 *
 */

;(function ( $, window, document, undefined ) {

$.fn.transition = function(parameters) {
  var
    $allModules     = $(this),
    moduleSelector  = $allModules.selector || '',

    settings        = ( $.isPlainObject(parameters) )
      ? $.extend(true, {}, $.fn.transition.settings, parameters)
      : $.fn.transition.settings,

    // set shortcuts
    error           = settings.error,
    className       = settings.className,
    namespace       = settings.namespace,
    metadata        = settings.metadata,
    moduleNamespace = 'module-' + namespace,

    time            = new Date().getTime(),
    performance     = [],

    moduleArguments = arguments,
    query           = moduleArguments[0],
    queryArguments  = [].slice.call(arguments, 1),
    methodInvoked   = (typeof query === 'string'),

    requestAnimationFrame = window.requestAnimationFrame
      || window.mozRequestAnimationFrame
      || window.webkitRequestAnimationFrame
      || window.msRequestAnimationFrame
      || function(callback) { setTimeout(callback, 0); },

    invokedResponse
  ;
  $allModules
    .each(function() {
      var
        $module  = $(this),
        element  = this,
        instance = $module.data(moduleNamespace),

        // set at run time
        animationEnd,
        animationName,

        namespace,
        module
      ;

      module = {

        initialize: function() {
          module.verbose('Initializing transition');

          settings        = module.get.settings.apply(element, moduleArguments);
          module.debug('Converted arguments into settings object', settings);

          animationEnd    = module.get.animationEvent();
          animationName   = module.get.animationName();
          module.verbose('Determined browser vendor prefixes', animationEnd, animationName);

          if(instance === undefined) {
            module.instantiate();
          }
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
          ;
        },

        animate: function(overrideSettings) {
          settings = overrideSettings || settings;
          module.debug('Preparing animation', settings.animation);
          if(module.is.animating() && settings.queue) {
            module.queue(settings.animation);
            return false;
          }
          requestAnimationFrame(function() {
            module.save.conditions();
            module.set.animating();
            module.repaint();
            module.set.duration(settings.duration);
            $module
              .addClass(className.transition)
              .addClass(settings.animation)
              .one(animationEnd, module.complete)
            ;
            if(module.can.transition()) {
              if(!module.has.direction()) {
                module.set.direction();
              }
              module.set.display();
              module.remove.hidden();
            }
            if(module.can.animate()) {
              module.debug('Starting tween', settings.animation, $module.attr('class'));
              module.repaint();
            }
            else {
              module.restore.conditions();
              module.error(error.noAnimation);
            }
          });
        },

        queue: function(animation) {
          module.debug('Queueing animation of', animation);
          instance.queuing = true;
          $module
            .one(animationEnd, function() {
              instance.queuing = false;
              module.animate.apply(this, settings);
            })
          ;
        },

        complete: function () {
          module.verbose('CSS animation complete', settings.animation);
          if(!module.is.looping()) {
            if( module.is.outward() ) {
              module.restore.conditions();
              module.remove.display();
              module.hide();
            }
            else if( module.is.inward() ) {
              module.restore.conditions();
              module.show();
            }
            else {
              module.restore.conditions();
            }
            module.remove.duration();
            module.remove.animating();
          }
          $.proxy(settings.complete, this)();
        },

        repaint: function(fakeAssignment) {
          module.verbose('Forcing repaint event');
          fakeAssignment = element.offsetWidth;
        },

        has: {
          direction: function(animation) {
            animation = animation || settings.animation;
            if( module.is.inward() || module.is.outward() ) {
              return true;
            }
          }
        },

        set: {

          animating: function() {
            $module.addClass(className.animating);
          },

          display: function() {
            if(module.display !== 'block') {
              module.verbose('Setting final visibility to', module.display);
              $module
                .attr('style', $module.attr('style') + 'display:' + module.display + ';')
              ;
            }
          },

          direction: function() {
            if(module.is.visible()) {
              module.debug('Automatically determining the direction of animation', 'Outward');
              $module
                .addClass(className.outward)
                .removeClass(className.inward)
              ;
            }
            else {
              module.debug('Automatically determining the direction of animation', 'Inward');
              $module
                .addClass(className.inward)
                .removeClass(className.outward)
              ;
            }
          },

          looping: function() {
            module.debug('Transition set to loop');
            $module
              .addClass(className.looping)
            ;
          },

          duration: function(duration) {
            duration = duration || settings.duration;
            duration = (typeof duration == 'number')
              ? duration + 'ms'
              : duration
            ;
            module.verbose('Setting animation duration', duration);
            $module
              .css({
                '-webkit-animation-duration' : duration,
                '-moz-animation-duration'    : duration,
                '-ms-animation-duration'     : duration,
                '-o-animation-duration'      : duration,
                'animation-duration'         : duration
              })
            ;
          }
        },

        save: {
          transitionExists: function(animation, exists) {
            $.fn.transition.exists[animation] = exists;
            module.verbose('Saving existence of transition', animation, exists);
          },
          conditions: function() {
            module.cache = {
              className : $module.attr('class'),
              style     : $module.attr('style')
            };
            module.verbose('Saving original attributes', module.cache);
          }
        },

        restore: {
          conditions: function() {
            if(typeof module.cache === undefined) {
              module.error(error.cache);
              return false;
            }
            if(module.cache.className) {
              $module.attr('class', module.cache.className);
            }
            else {
              $module.removeAttr('class');
            }
            if(module.cache.style) {
              $module
                .attr('style', module.cache.style)
              ;
            }
            if(module.is.looping()) {
              module.remove.looping();
            }
            module.verbose('Restoring original attributes', module.cache);
          }
        },

        remove: {
          animating: function() {
            $module.removeClass(className.animating);
          },
          display: function() {
            $module.css('display', '');
          },
          duration: function() {
            $module
              .css({
                '-webkit-animation-duration' : '',
                '-moz-animation-duration'    : '',
                '-ms-animation-duration'     : '',
                '-o-animation-duration'      : '',
                'animation-duration'         : ''
              })
            ;
          },
          hidden: function() {
            $module.removeClass(className.hidden);
          },
          looping: function() {
            module.debug('Transitions are no longer looping');
            $module
              .removeClass(className.looping)
            ;
            module.repaint();
          }
        },

        get: {
          settings: function(animation, duration, complete) {
            // single settings object
            if(typeof animation == 'object') {
              return $.extend(true, {}, $.fn.transition.settings, animation);
            }
            // all arguments provided
            else if(typeof complete == 'function') {
              return $.extend({}, $.fn.transition.settings, {
                animation : animation,
                complete  : complete,
                duration  : duration
              });
            }
            // only duration provided
            else if(typeof duration == 'string' || typeof duration == 'number') {
              return $.extend({}, $.fn.transition.settings, {
                animation : animation,
                duration  : duration
              });
            }
            // duration is actually settings object
            else if(typeof duration == 'object') {
              return $.extend({}, $.fn.transition.settings, duration, {
                animation : animation
              });
            }
            // duration is actually callback
            else if(typeof duration == 'function') {
              return $.extend({}, $.fn.transition.settings, {
                animation : animation,
                complete  : duration
              });
            }
            // only animation provided
            else {
              return $.extend({}, $.fn.transition.settings, {
                animation : animation
              });
            }
            return $.fn.transition.settings;
          },
          transitionExists: function(animation) {
            return $.fn.transition.exists[animation];
          },
          animationName: function() {
            var
              element     = document.createElement('div'),
              animations  = {
                'animation'       :'animationName',
                'OAnimation'      :'oAnimationName',
                'MozAnimation'    :'mozAnimationName',
                'WebkitAnimation' :'webkitAnimationName'
              },
              animation
            ;
            for(animation in animations){
              if( element.style[animation] !== undefined ){
                module.verbose('Determining animation vendor name property', animations[animation]);
                return animations[animation];
              }
            }
            return false;
          },
          animationEvent: function() {
            var
              element     = document.createElement('div'),
              animations  = {
                'animation'       :'animationend',
                'OAnimation'      :'oAnimationEnd',
                'MozAnimation'    :'mozAnimationEnd',
                'WebkitAnimation' :'webkitAnimationEnd'
              },
              animation
            ;
            for(animation in animations){
              if( element.style[animation] !== undefined ){
                module.verbose('Determining animation vendor end event', animations[animation]);
                return animations[animation];
              }
            }
            return false;
          }

        },

        can: {
          animate: function() {
            if($module.css(settings.animation) !== 'none') {
              module.debug('CSS definition found',  $module.css(settings.animation));
              return true;
            }
            else {
              module.debug('Unable to find css definition', $module.attr('class'));
              return false;
            }
          },
          transition: function() {
            var
              animation = settings.animation,
              transitionExists = module.get.transitionExists(settings.animation),
              $clone,
              currentAnimation,
              inAnimation,
              display
            ;
            if( transitionExists === undefined || module.display === undefined) {
              $clone = $('<div>').addClass( $module.attr('class') ).appendTo($('body'));
              currentAnimation = $clone
                .removeClass(className.inward)
                .removeClass(className.outward)
                .css(animationName)
              ;
              inAnimation = $clone
                .addClass(className.inward)
                .css(animationName)
              ;
              display = $clone
                .removeClass(className.inward)
                .removeClass(className.animating)
                .removeClass(className.visible)
                .removeClass(className.hidden)
                .show()
                .css('display')
              ;
              if(currentAnimation != inAnimation) {
                module.debug('Transition exists for animation', animation);
                transitionExists = true;
              }
              else {
                module.debug('Static animation found', animation, display);
                transitionExists = false;
              }
              $clone.remove();
              module.display = display;
              module.save.transitionExists(animation, transitionExists);
            }
            return transitionExists;
          }
        },

        is: {
          animating: function() {
            return $module.hasClass(className.animating);
          },
          inward: function() {
            return $module.hasClass(className.inward);
          },
          outward: function() {
            return $module.hasClass(className.outward);
          },
          looping: function() {
            return $module.hasClass(className.looping);
          },
          visible: function() {
            return $module.is(':visible');
          }
        },

        hide: function() {
          module.verbose('Hiding element');
          $module
            .removeClass(className.visible)
            .addClass(className.transition)
            .addClass(className.hidden)
          ;
          module.repaint();
        },

        show: function(display) {
          module.verbose('Showing element', display);
          $module
            .addClass(className.transition)
            .addClass(className.visible)
          ;
          module.set.display();
          module.repaint();
        },

        start: function() {
          module.verbose('Starting animation');
          $module.removeClass(className.disabled);
        },

        stop: function() {
          module.debug('Stopping animation');
          $module.addClass(className.disabled);
        },

        toggle: function() {
          module.debug('Toggling play status');
          $module.toggleClass(className.disabled);
        },

        setting: function(name, value) {
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
          if($.isArray(invokedResponse)) {
            invokedResponse.push(response);
          }
          else if(typeof invokedResponse == 'string') {
            invokedResponse = [invokedResponse, response];
          }
          else if(response !== undefined) {
            invokedResponse = response;
          }
          return found || false;
        }
      };

      if(instance === undefined) {
        module.initialize();
      }
      if(module.invoke(query) === false) {
        module.invoke('animate');
        invokedResponse = undefined;
      }

    })
  ;
  return (invokedResponse !== undefined)
    ? invokedResponse
    : this
  ;
};

$.fn.transition.exists = {};

$.fn.transition.settings = {

  // module info
  name   : 'Transition',

  // debug content outputted to console
  debug        : true,

  // verbose debug output
  verbose      : true,

  // performance data output
  performance  : true,

  // event namespace
  namespace    : 'transition',

  // animation complete event
  complete     : function() {},

  // animation duration
  animation    : 'fade',
  duration     : '700ms',

  // queue up animations
  queue        : true,

  className    : {
    animating  : 'animating',
    disabled   : 'disabled',
    hidden     : 'hidden',
    inward     : 'in',
    loading    : 'loading',
    looping    : 'looping',
    outward    : 'out',
    transition : 'ui transition',
    visible    : 'visible'
  },

  // possible errors
  error: {
    noAnimation : 'There is no css animation matching the one you specified.',
    method      : 'The method you called is not defined'
  }

};


})( jQuery, window , document );
