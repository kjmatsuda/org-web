import React, { PureComponent } from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';

import { Motion, spring } from 'react-motion';
import { UnmountClosed as Collapse } from 'react-collapse';

import * as orgActions from '../../../../actions/org';
import * as baseActions from '../../../../actions/base';

import './stylesheet.css';

import classNames from 'classnames';
import _ from 'lodash';

import TitleLine from '../TitleLine';
import HeaderContent from '../HeaderContent';
import HeaderActionDrawer from './components/HeaderActionDrawer';

import { headerWithId } from '../../../../lib/org_utils';
import { interpolateColors, rgbaObject, rgbaString } from '../../../../lib/color';

class Header extends PureComponent {
  SWIPE_ACTION_ACTIVATION_DISTANCE = 80;
  FREE_DRAG_ACTIVATION_DISTANCE = 10;

  constructor(props) {
    super(props);

    _.bindAll(this, [
      'handleRef',
      'handleMouseDown',
      'handleMouseMove',
      'handleMouseUp',
      'handleMouseOut',
      'handleTouchMove',
      'handleTouchStart',
      'handleTouchEnd',
      'handleTouchCancel',
      'handleHeaderClick',
      'handleEnterTitleEditMode',
      'handleEnterDescriptionEditMode',
      'handleShowTagsModal',
      'handleFocus',
      'handleUnfocus',
      'handleAddNewHeader',
      'handleRest',
      'handleDeadlineClick',
      'handleScheduledClick',
    ]);

    this.state = {
      isDraggingFreely: false,
      dragStartX: null,
      dragStartY: null,
      currentDragX: null,
      containerWidth: null,
      isPlayingRemoveAnimation: false,
      heightBeforeRemove: null,
    };
  }

  componentDidMount() {
    if (this.containerDiv) {
      this.setState({ containerWidth: this.containerDiv.offsetWidth });
    }
  }

  handleRef(containerDiv) {
    this.containerDiv = containerDiv;
    this.props.onRef(containerDiv);
  }

  handleDragStart(event, dragX, dragY) {
    if (this.props.shouldDisableActions) {
      return;
    }
    if (this.props.inEditMode) {
      return;
    }

    if (!!event.target.closest('.table-part')) {
      return;
    }

    this.setState({
      dragStartX: dragX,
      dragStartY: dragY,
    });
  }

  handleDragMove(dragX, dragY) {
    const { dragStartX, dragStartY } = this.state;
    if (dragStartX === null) {
      return;
    }

    if (!this.state.isDraggingFreely) {
      if (Math.abs(dragX - dragStartX) >= this.FREE_DRAG_ACTIVATION_DISTANCE) {
        this.setState({ isDraggingFreely: true });
      }
    }

    if (Math.abs(dragY - dragStartY) >= this.SWIPE_ACTION_ACTIVATION_DISTANCE / 2) {
      this.setState({ dragStartX: null });
    } else {
      this.setState({ currentDragX: dragX });
    }
  }

  handleDragEnd() {
    const { dragStartX, currentDragX } = this.state;

    if (!!dragStartX && !!currentDragX) {
      const swipeDistance = currentDragX - dragStartX;

      if (swipeDistance >= this.SWIPE_ACTION_ACTIVATION_DISTANCE) {
        this.props.org.advanceTodoState(this.props.header.get('id'));
      }

      if (-1 * swipeDistance >= this.SWIPE_ACTION_ACTIVATION_DISTANCE) {
        this.setState({
          isPlayingRemoveAnimation: true,
          heightBeforeRemove: this.containerDiv.offsetHeight,
        });
      }
    }

    this.setState({
      dragStartX: null,
      currentDragX: null,
      isDraggingFreely: false,
    });
  }

  handleDragCancel() {
    this.setState({
      dragStartX: null,
      currentDragX: null,
      isDraggingFreely: false,
    });
  }

  handleMouseDown(event) {
    this.handleDragStart(event, event.clientX, event.clientY);
  }

  handleMouseMove(event) {
    this.handleDragMove(event.clientX, event.clientY);
  }

  handleMouseUp() {
    this.handleDragEnd();
  }

  handleMouseOut() {
    this.handleDragCancel();
  }

  handleTouchStart(event) {
    this.handleDragStart(event, event.changedTouches[0].clientX, event.changedTouches[0].clientY);
  }

  handleTouchMove(event) {
    this.handleDragMove(event.changedTouches[0].clientX, event.changedTouches[0].clientY);
  }

  handleTouchEnd() {
    this.handleDragEnd();
  }

  handleTouchCancel() {
    this.handleDragCancel();
  }

  handleHeaderClick(event) {
    const classList = event.target.classList;
    if (classList.contains('header') || classList.contains('header__bullet')) {
      const { header, hasContent, isSelected } = this.props;

      if (hasContent && (!header.get('opened') || isSelected)) {
        this.props.org.toggleHeaderOpened(header.get('id'));
      }

      this.props.org.selectHeader(header.get('id'));
    }
  }

  handleEnterTitleEditMode() {
    this.props.org.enterEditMode('title');
  }

  handleEnterDescriptionEditMode() {
    this.props.org.openHeader(this.props.header.get('id'));
    this.props.org.enterEditMode('description');
  }

  handleShowTagsModal() {
    this.props.base.activatePopup('tags-editor');
  }

  handleFocus() {
    this.props.org.focusHeader(this.props.header.get('id'));
  }

  handleUnfocus() {
    this.props.org.unfocusHeader();
  }

  handleAddNewHeader() {
    this.props.org.addHeaderAndEdit(this.props.header.get('id'), this.props.defaultHeaderText);
  }

  handleRest() {
    if (this.state.isPlayingRemoveAnimation) {
      this.props.org.removeHeader(this.props.header.get('id'));
    }
  }

  handleDeadlineAndScheduledClick(planningType) {
    const { header } = this.props;

    const existingDeadlinePlanningItemIndex = header
      .get('planningItems', [])
      .findIndex(planningItem => planningItem.get('type') === planningType);

    if (existingDeadlinePlanningItemIndex === -1) {
      this.props.org.addNewPlanningItem(header.get('id'), planningType);
      this.props.base.activatePopup('timestamp-editor', {
        headerId: header.get('id'),
        planningItemIndex: header.get('planningItems').size,
      });
    } else {
      this.props.base.activatePopup('timestamp-editor', {
        headerId: header.get('id'),
        planningItemIndex: existingDeadlinePlanningItemIndex,
      });
    }

    this.props.org.openHeader(header.get('id'));
  }

  handleDeadlineClick() {
    this.handleDeadlineAndScheduledClick('DEADLINE');
  }

  handleScheduledClick() {
    this.handleDeadlineAndScheduledClick('SCHEDULED');
  }

  render() {
    const {
      header,
      color,
      hasContent,
      isSelected,
      bulletStyle,
      focusedHeader,
      isFocused,
      shouldDisableActions,
    } = this.props;

    const indentLevel = !!focusedHeader
      ? header.get('nestingLevel') - focusedHeader.get('nestingLevel') + 1
      : header.get('nestingLevel');

    const {
      dragStartX,
      currentDragX,
      isDraggingFreely,
      isPlayingRemoveAnimation,
      containerWidth,
    } = this.state;
    const marginLeft =
      !!dragStartX && !!currentDragX && isDraggingFreely
        ? currentDragX - dragStartX
        : isPlayingRemoveAnimation
          ? spring(-1 * containerWidth, { stiffness: 300 })
          : spring(0, { stiffness: 300 });

    const style = {
      paddingLeft: 20 * indentLevel,
      marginLeft,
      heightFactor: isPlayingRemoveAnimation ? spring(0, { stiffness: 300 }) : 1,
    };

    const className = classNames('header', {
      'header--selected': isSelected,
      'header--removing': isPlayingRemoveAnimation,
    });

    return (
      <Motion style={style} onRest={this.handleRest}>
        {interpolatedStyle => {
          const swipedDistance = interpolatedStyle.marginLeft;
          const isLeftActionActivated = swipedDistance >= this.SWIPE_ACTION_ACTIVATION_DISTANCE;
          const isRightActionActivated =
            -1 * swipedDistance >= this.SWIPE_ACTION_ACTIVATION_DISTANCE;

          const disabledColor = rgbaObject(211, 211, 211, 1);
          const leftActivatedColor = rgbaObject(0, 128, 0, 1);
          const rightActivatedColor = rgbaObject(255, 0, 0, 1);

          const leftSwipeActionContainerStyle = {
            width: interpolatedStyle.marginLeft,
            backgroundColorFactor: spring(isLeftActionActivated ? 1 : 0, { stiffness: 300 }),
          };
          const rightSwipeActionContainerStyle = {
            width: -1 * interpolatedStyle.marginLeft,
            backgroundColorFactor: spring(isRightActionActivated ? 1 : 0, { stiffness: 300 }),
          };

          const leftIconStyle = {
            display: swipedDistance > 30 ? '' : 'none',
          };
          const rightIconStyle = {
            display: -1 * swipedDistance > 30 ? '' : 'none',
          };

          const { heightFactor, ...headerStyle } = interpolatedStyle;

          if (isPlayingRemoveAnimation) {
            headerStyle.height = this.state.heightBeforeRemove * heightFactor;
          }

          return (
            <div
              className={className}
              style={headerStyle}
              ref={this.handleRef}
              onClick={this.handleHeaderClick}
              onMouseDown={this.handleMouseDown}
              onMouseMove={this.handleMouseMove}
              onMouseUp={this.handleMouseUp}
              onMouseOut={this.handleMouseOut}
              onTouchStart={this.handleTouchStart}
              onTouchMove={this.handleTouchMove}
              onTouchEnd={this.handleTouchEnd}
              onTouchCancel={this.handleTouchCancel}
            >
              <Motion style={leftSwipeActionContainerStyle}>
                {leftInterpolatedStyle => {
                  const leftStyle = {
                    width: leftInterpolatedStyle.width,
                    backgroundColor: rgbaString(
                      interpolateColors(
                        disabledColor,
                        leftActivatedColor,
                        leftInterpolatedStyle.backgroundColorFactor
                      )
                    ),
                  };

                  return (
                    <div className="left-swipe-action-container" style={leftStyle}>
                      <i
                        className="fas fa-check swipe-action-container__icon swipe-action-container__icon--left"
                        style={leftIconStyle}
                      />
                    </div>
                  );
                }}
              </Motion>
              <Motion style={rightSwipeActionContainerStyle}>
                {rightInterpolatedStyle => {
                  const rightStyle = {
                    width: rightInterpolatedStyle.width,
                    backgroundColor: rgbaString(
                      interpolateColors(
                        disabledColor,
                        rightActivatedColor,
                        rightInterpolatedStyle.backgroundColorFactor
                      )
                    ),
                  };

                  return (
                    <div className="right-swipe-action-container" style={rightStyle}>
                      <i
                        className="fas fa-times swipe-action-container__icon swipe-action-container__icon--right"
                        style={rightIconStyle}
                      />
                    </div>
                  );
                }}
              </Motion>

              <div style={{ marginLeft: -16, color }} className="header__bullet">
                {bulletStyle === 'Fancy' ? '●' : '*'}
              </div>
              <TitleLine
                header={header}
                color={color}
                hasContent={hasContent}
                isSelected={isSelected}
                shouldDisableActions={shouldDisableActions}
              />

              <Collapse
                isOpened={isSelected && !shouldDisableActions}
                springConfig={{ stiffness: 300 }}
                style={{ marginRight: rightSwipeActionContainerStyle.width }}
              >
                <HeaderActionDrawer
                  onEnterTitleEditMode={this.handleEnterTitleEditMode}
                  onEnterDescriptionEditMode={this.handleEnterDescriptionEditMode}
                  isFocused={isFocused}
                  onTagsClick={this.handleShowTagsModal}
                  onFocus={this.handleFocus}
                  onUnfocus={this.handleUnfocus}
                  onAddNewHeader={this.handleAddNewHeader}
                  onDeadlineClick={this.handleDeadlineClick}
                  onScheduledClick={this.handleScheduledClick}
                />
              </Collapse>

              <HeaderContent header={header} shouldDisableActions={shouldDisableActions} />
            </div>
          );
        }}
      </Motion>
    );
  }
}

const mapStateToProps = (state, props) => {
  const focusedHeader = !!state.org.present.get('focusedHeaderId')
    ? headerWithId(state.org.present.get('headers'), state.org.present.get('focusedHeaderId'))
    : null;

  return {
    bulletStyle: state.base.get('bulletStyle'),
    defaultHeaderText: state.base.get('defaultHeaderText') || '',
    focusedHeader,
    isFocused: !!focusedHeader && focusedHeader.get('id') === props.header.get('id'),
    inEditMode: !!state.org.present.get('editMode'),
  };
};

const mapDispatchToProps = dispatch => ({
  org: bindActionCreators(orgActions, dispatch),
  base: bindActionCreators(baseActions, dispatch),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Header);
