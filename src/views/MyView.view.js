import React, { Component } from 'react';
import { Text, View } from 'react-native';
import Constants from '../../shared/constants';
import { TypeConstants } from '../../shared/styles/typography';

// Styles for this View
import Styles from './MyView.styles';

// Custom components
//import {} from '../../components';

// Sub-views
//import {} from '../';

export default class MyView extends Component {
	render() {
		return (
			<View style={[ Styles.container, this.props.style ]}>
				<Text>View placeholder for MyView</Text>
			</View>
		)
	}
}
