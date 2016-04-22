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
import io from 'socket.io-client/socket.io';
window.navigator.userAgent = "react-native";

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
  },
  onOpenAnnotation(annotation) {
    console.log(annotation);
  },
  onRightAnnotationTapped(e) {
    console.log(e);
  },
  atSameLocation() {
    const precisionRadius = 1000;
    return false;
  },
  onLongPress(location) {
    console.log('long pressed', location);

    var addDestination = function() {
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
    }

    AlertIOS.alert('Destination', 'Add Destination?', [
      {text: 'Yes, set destination', onPress: addDestination.bind(this), style: 'default'},
      {text: 'No, Cancel', onPress: () => { console.log('cancelled'); }, style: 'cancel'}
      ]
      );
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

      // Compare my radius to my end points and if they intersect emit a notification and disconnect
      this.checkProximityToEndPoint(this.state.currentLoc, loc, id, this.socket);

      // Find the appropriate friend that triggered the change and update the map with friend's new location.
      var friends = this.friends;
      var friend;
      for (var i = 0; i < friends.length; i++) {
        if (friends[i].uid === id) {
          friend = friends[i];
          // NOTE: Consider breaking out of the loop once the friend is found.
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
      if (loc.latitude !== this.state.currentLoc.latitude) {
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
      }
    });

    /*
     * When a friend logs off, remove the friend from this user's list of connected users.
     */
    this.socket.on('logoff', (id) => {
      this.removeAnnotation(mapRef, id);
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
   * Determines if a user and a end-points location intersect. If so,
   * notifies the end-point that the user is within the vicinity. Finally disconnects from map and is removed
   * from end-points maps.
   * @params: myCoordinates - {longitude, latitude} of the user
   *          endPointCoordinates - {longitude, latitude} of endPoint
   *          endPointID - id of the end-point
   */
  checkProximityToEndPoint: function(myCoordinates, endPointCoordinates, endPointID, socket) {
    // Create a 1 mile polygon around user and end-point and see if they intercept
    var myLocation = turf.point([myCoordinates['longitude'], myCoordinates['latitude']], {name: 'me'});
    var endPointLocation = turf.point([endPointCoordinates['longitude'], endPointCoordinates['latitude']], {name: 'end-point'});
    var myVicinity = turf.buffer(myLocation, 1, 'miles');
    var endPointVicinity = turf.buffer(endPointLocation, 1, 'miles');
    if (turf.inside(myLocation, endPointVicinity.features[0])) {
      // push notification that my location is near my endpoint
      socket.emit('notification', {senderID: socket.id, recipientID: endPointID, message: 'Within vicinity'});
      socket.emit('disconnect');
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
