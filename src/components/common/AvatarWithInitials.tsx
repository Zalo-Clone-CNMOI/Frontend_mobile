import React from 'react';

import { Image, StyleSheet, Text, View } from 'react-native';

import { getAvatarColor, getInitials } from '../../utils/avatarUtils';



interface AvatarWithInitialsProps {

  name: string;

  size?: number;

  style?: any;

  avatarUrl?: string | null;

}



export const AvatarWithInitials: React.FC<AvatarWithInitialsProps> = ({

  name,

  size = 55,

  style,

  avatarUrl,

}) => {

  const initials = getInitials(name, 2);

  const backgroundColor = getAvatarColor(name);

  return (

    <View

      style={[

        styles.container,

        {

          width: size,

          height: size,

          borderRadius: size / 2,

          backgroundColor,

        },

        style,

      ]}

    >

      {avatarUrl ? (

        <Image

          source={{ uri: avatarUrl }}

          style={[

            styles.image,

            {

              width: size,

              height: size,

              borderRadius: size / 2,

            },

          ]}

          resizeMode="cover"

        />

      ) : (

        <Text

          style={[

            styles.text,

            {

              fontSize: size * 0.4,

            },

          ]}

        >

          {initials}

        </Text>

      )}

    </View>

  );

};



const styles = StyleSheet.create({

  container: {

    justifyContent: 'center',

    alignItems: 'center',

    borderWidth: 1,

    borderColor: 'rgba(0, 0, 0, 0.1)',

    overflow: 'hidden',

  },

  image: {

    position: 'absolute',

  },

  text: {

    color: '#FFFFFF',

    fontWeight: '600',

  },

});

