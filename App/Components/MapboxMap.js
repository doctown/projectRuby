import React, {
  View,
  Component,
  Text,
  TouchableHighlight,
  StyleSheet,
  StatusBar,
  Dimensions,
  AlertIOS
} from 'react-native';
import Mapbox from 'react-native-mapbox-gl';
window.navigator.userAgent = "react-native";
let io = require('socket.io-client/socket.io');

var api = require('../Utils/api');
var turf = require('turf');
var mapRef = 'mapRef';
var _ = require('lodash');

var MapboxMap = React.createClass({
  mixins: [Mapbox.Mixin],
  getInitialState() {
    return {
      zoom: 17,
      boundSet: false,
      currentLoc: undefined,
      annotations: [{
        coordinates: [40.72052634, -73.97686958312988],
        'type': 'point',
        title: 'This is marker 1',
        subtitle: 'It has a rightCalloutAccessory too',
        rightCalloutAccessory: {
          url: 'https://cldup.com/9Lp0EaBw5s.png',
          height: 25,
          width: 25
        },
        annotationImage: {
          url: 'https://cldup.com/CnRLZem9k9.png',
          height: 25,
          width: 25
        },
        id: 'marker1'
      }],
      socket: io('http://159.203.222.32:4568', {jsonp: false})
    };
  },
  onRegionChange(location) {
    this.setState({ currentZoom: location.zoom });
  },
  onRegionWillChange(location) {
    // console.log(location);
  },
  emitLocation(location) {
    this.socket.emit('change location', location);
    console.log('updating location');
  },
  onUpdateUserLocation(location) {
    this.emitLocationThrottled(location);
    this.setState({currentLoc: location});

    if (this.destination) {
      if (this.atSameLocation(location, this.destination, {distance: 1500, unit: 'meters'})) {
        this.removeAnnotation(mapRef, 'destination');
        delete this.destination;
        this.socket.emit('remove destination');
      }
    }
  },
  onOpenAnnotation(annotation) {
    console.log(annotation);
  },
  onRightAnnotationTapped(e) {
    console.log(e);
  },
  /*
   * Determines if two locations are at the same location.
   * @params: option.distance - distance between coordinates
   *          option.unit - unit of measurement for distance
   */
   atSameLocation(location1, location2, option = {distance: 1, unit: 'miles'}) {
    // Create a polygon around location1 and location2 and see if they intercept
    var point1 = turf.point([location1['longitude'], location1['latitude']], {name: 'loc-1'});
    var point2 = turf.point([location2['longitude'], location2['latitude']], {name: 'loc-2'});
    var point2Vicinity = turf.buffer(point2, option.distance, option.unit);

    return turf.inside(point1, point2Vicinity.features[0]);
  },
  onLongPress(location) {
    var addDestination = function() {
      this.destination = location;
      this.updateAnnotation(mapRef, {
        coordinates: [location.latitude, location.longitude],
        'type': 'point',
        title: 'Current Destination',
        annotationImage: {
          url: 'https://www.uniteller.com/images/Destination_Icon.png',
          height: 40,
          width: 50
        },
        id: 'destination'
      });

      this.socket.emit('set destination', location);
    };

    var removeDestination = function() {
      delete this.destination;
      this.removeAnnotation(mapRef, 'destination');
      this.socket.emit('remove destination')
    };

    if (!this.destination) {
      AlertIOS.alert('Destination', 'Add Destination?', [
        {text: 'Yes, set destination', onPress: addDestination.bind(this), style: 'default'},
        {text: 'No, Cancel', onPress: () => { console.log('cancelled'); }, style: 'cancel'}
        ]
        );
    } else {
      AlertIOS.alert('Destination', 'Update Destination?', [
        {text: 'Yes, update destination', onPress: addDestination.bind(this), style: 'default'},
        {text: 'Remove Destination', onPress: removeDestination.bind(this), style: 'default'},
        {text: 'No, Cancel', onPress: () => { console.log('cancelled'); }, style: 'cancel'}
        ]
        );
    }
  },
  onTap(location) {
    console.log('tapped', location);
  },
  componentDidMount(){
    this.setUserTrackingMode(mapRef, this.userTrackingMode.follow);
    this.socket = io.connect('http://159.203.222.32:4568', {jsonp: false});
    this.socket.emit('registerID', this.props.userInfo.uid);

    this.emitLocationThrottled = _.throttle(this.emitLocation, 15000);

    // Fetches the friends from the database, creates a list of friends,
    // and sends the list to the server to be added on the socket.friends for this user.
    api.getUserFriends(this.props.userInfo.uid).then((friendData) => {
      this.friends = friendData;
      var friendIDs = friendData.map((friend) => {
        return friend.uid;
      });
      this.socket.emit('registerFriends', friendIDs);
    });

    // Response to chat messages sent on socket
    this.socket.on('chat message', (msg) => {
      console.log('Woohoo it worked! ', msg);
    });

    /*
     * A friend is within your radius. Handle a notification and renders the update.
     * @params: notification.message - message to be communicated
     *          notification.senderID - id of the sender
     *          notification.recipientID - id of the person to be notified
     */
     this.socket.on('notification', (notification) => {
      // TODO: Add a notification event like a push notification.
      console.log('notification received');
    });

    var connectedIDs = []; // all friend ids that are currently connected

    /*
     * Indicates that user has changed locations.
     * @params: changeInfo.id - users id
     *          changeInfo.loc.longitude - longitude
     *          changeInfo.loc.latitude - latitude
     *          this.fiends.uid - user id of the friend
     */
     this.socket.on('change location', (changeInfo) => {
      var id = changeInfo.id;
      var loc = changeInfo.loc;

      // Compare my location radius to my end point's and if they intersect emit a notification
      this.checkProximityToEndPoint(this.state.currentLoc, loc, id, this.socket, {distance: 1, unit: 'miles'});

      // Find the appropriate friend that triggered the change and update the map with friend's new location.
      var friends = this.friends;
      var friend;
      for (var i = 0; i < friends.length; i++) {
        if (friends[i].uid === id) {
          friend = friends[i];
          // NOTE: Consideration, breaking out of the loop once the friend is found.
        }
      }

      // Update connected friend's list with this friends id and send the user's current location
      if (connectedIDs.indexOf(id) < 0) {
        connectedIDs.push(id);
        this.emitLocation(this.state.currentLoc);
      }

      var myLat = this.state.currentLoc.latitude;
      var myLong = this.state.currentLoc.longitude;
      var lat = loc.latitude;
      var long = loc.longitude;

      this.updateAnnotation(mapRef, {
        coordinates: [lat, long],
        'type': 'point',
        title: friend.name,
        subtitle: friend.status,
        annotationImage: {
          url: friend.profileImageURL,
          height: 25,
          width: 25
        },
        id: id
      });

      if (!this.state.boundSet) {
        this.setVisibleCoordinateBoundsAnimated(mapRef, lat, long, myLat, myLong, 50, 50, 50, 50);
        this.state.boundSet = true;
      }
    });

     this.socket.on('set destination', (destinationInfo) => {
      var id = destinationInfo.id;
      var loc = destinationInfo.loc;

      /* Find appropriate friend to update map info */
      var friends = this.friends;
      var friend;
      for (var i = 0; i < friends.length; i++) {
        if (friends[i].uid === id) {
          friend = friends[i];
        }
      }

      var myLat = this.state.currentLoc.latitude;
      var myLong = this.state.currentLoc.longitude;
      var lat = loc.latitude;
      var long = loc.longitude;
      this.updateAnnotation(mapRef, {
        coordinates: [lat, long],
        'type': 'point',
        title: friend.name + '\'s destination',
        annotationImage: {
          url: 'http://www.xn--9dbccjlkfq.com/route-planner-widget/img/destination-icon.png',
          height: 25,
          width: 25
        },
        id: id + 'dest'
      });

      if (!this.state.boundSet) {
        this.setVisibleCoordinateBoundsAnimated(mapRef, lat, long, myLat, myLong, 50, 50, 50, 50);
        this.state.boundSet = true;
      }
    });

     this.socket.on('remove destination', (id) => {
      this.removeAnnotation(mapRef, id + 'dest');
    });

    /*
     * When a friend logs off, remove the friend from this user's list of connected users.
     */
     this.socket.on('logoff', (id) => {
      this.removeAnnotation(mapRef, id);
      this.removeAnnotation(mapRef, id + 'dest');
      connectedIDs.splice(connectedIDs.indexOf(id), 1);
    });

     this.socket.on('found location', (loc) => {
      console.log('This is the loc from website: ', loc);
      // loc comes in as [longitude, latitude] which is what the webapp version wants,
      // but the react native version wants the [latitude, longitude], so we flip them.
      var locFlip = [loc[1], loc[0]];
      this.setVisibleCoordinateBoundsAnimated(mapRef, locFlip[0], locFlip[1], this.state.currentLoc.latitude, this.state.currentLoc.longitude, 100, 0, 0, 0);
      // fetch(`https://api.mapbox.com/v4/directions/mapbox.driving/${this.state.currentLoc.longitude},${this.state.currentLoc.latitude};${loc[0]},${loc[1]}.json?access_token=${loc[2]}`,
      //   {method: 'get'})
      //   .then((res) => {console.log(res)});
    });
   },
  /*
   * Determines if a user and a end-points' location intersect. If so,
   * notifies the end-point that the user is within the vicinity.
   * @params: myCoordinates - {longitude, latitude} of the user
   *          endPointCoordinates - {longitude, latitude} of endPoint
   *          endPointID - id of the end-point
   *          socket - socket used to communicate to notification
   *          option.distance - distance between coordinates
   *          option.unit - unit of measurement for distance
   */
   checkProximityToEndPoint: function(myCoordinates, endPointCoordinates, endPointID, socket, option) {
    if (this.atSameLocation(myCoordinates, endPointCoordinates, option)) {
      // push notification that my location is near my endpoint
      socket.emit('notification', {senderID: socket.id, recipientID: endPointID, message: 'Within vicinity'});
    }
  },
  render: function() {
    StatusBar.setHidden(true);
    return (
      <View style={styles.main}>
      <Mapbox
      style={styles.container}
      direction={0}
      rotateEnabled={true}
      scrollEnabled={true}
      zoomEnabled={true}
      showsUserLocation={true}
      ref={mapRef}
      accessToken={'pk.eyJ1IjoiaW5qZXllbyIsImEiOiJHYUJMWGV3In0.-9Wcu6yJNQmem2IXWaRuIg'}
      styleURL={this.mapStyles.emerald}
      userTrackingMode={this.userTrackingMode.none}
      centerCoordinate={this.state.center}
      zoomLevel={this.state.zoom}
      onRegionChange={this.onRegionChange}
      onRegionWillChange={this.onRegionWillChange}
      annotations={this.state.annotations}
      onOpenAnnotation={this.onOpenAnnotation}
      onRightAnnotationTapped={this.onRightAnnotationTapped}
      onUpdateUserLocation={this.onUpdateUserLocation}
      onLongPress={this.onLongPress}
      onTap={this.onTap} />
      </View>
      );
  }
});

var width = Dimensions.get('window').width;
var styles = StyleSheet.create({
  button: {
    width: 150,
    height: 200,
    backgroundColor: '#DDD'
  },
  container: {
    flex: 1,
    flexDirection: 'column',
    marginTop: -10,
    alignSelf: 'stretch',
    width: width
  },
  main: {
    flex: 1,
    alignItems: 'stretch',
    marginTop: 50
  }
});

module.exports = MapboxMap;
