import React, { useState } from 'react';
import { View } from 'react-native';
import { Menu, IconButton, Divider } from 'react-native-paper';
import { Post } from '../types';
import { useAuthStore } from '../state/authStore';

interface PostMenuProps {
  post: Post;
  onDelete: (postId: number) => void;
  onEdit: (post: Post) => void;
  onHide: (postId: number) => void;
  onUnhide: (postId: number) => void;
  onReportGone: (post: Post) => void;
  isHidden?: boolean;
  isOwnProfile?: boolean;
}

const PostMenu: React.FC<PostMenuProps> = ({ 
  post, 
  onDelete, 
  onEdit, 
  onHide, 
  onUnhide, 
  onReportGone, 
  isHidden = false, 
  isOwnProfile = false 
}) => {
  const [visible, setVisible] = useState(false);
  const currentUser = useAuthStore((state) => state.user);
  const isOwner = currentUser?.id === post.owner_id;

  const openMenu = () => setVisible(true);
  const closeMenu = () => setVisible(false);

  return (
    <View style={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}>
      <Menu
        visible={visible}
        onDismiss={closeMenu}
        anchor={<IconButton icon="dots-vertical" onPress={openMenu} />}
      >
        {isOwner ? (
          <>
            <Menu.Item onPress={() => { onEdit(post); closeMenu(); }} title="Edit" />
            <Menu.Item onPress={() => { onDelete(post.id); closeMenu(); }} title="Delete" />
            <Divider />
            {isHidden ? (
              <Menu.Item onPress={() => { onUnhide(post.id); closeMenu(); }} title="Show on feed" />
            ) : (
              <Menu.Item onPress={() => { onHide(post.id); closeMenu(); }} title="Hide from feed" />
            )}
            {!post.is_gone && <Menu.Item onPress={() => { onReportGone(post); closeMenu(); }} title="Report All Gone" />}
          </>
        ) : (
          <>
            {isHidden ? (
              <Menu.Item onPress={() => { onUnhide(post.id); closeMenu(); }} title="Show on feed" />
            ) : (
              <Menu.Item onPress={() => { onHide(post.id); closeMenu(); }} title="Hide from feed" />
            )}
            {!post.is_gone && <Menu.Item onPress={() => { onReportGone(post); closeMenu(); }} title="Report All Gone" />}
          </>
        )}
      </Menu>
    </View>
  );
};

export default PostMenu; 