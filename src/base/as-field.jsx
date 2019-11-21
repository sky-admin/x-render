import React from 'react';
import PropTypes from 'prop-types';
import { getValidateText } from './validate';
import { isHidden, isDependShow } from './isHidden';

// 解析字符串值
const parseString = (string, value, rootValue, formData) =>
  Function(`"use strict";
    const value = ${JSON.stringify(value)};
    const rootValue = ${JSON.stringify(rootValue)};
    const formData = ${JSON.stringify(formData)};
    return (${string})`)();

// asField拆分成逻辑组件和展示组件，从而可替换展示组件的方式完全插拔fr的样式
export const asField = ({ FieldUI, Widget }) => {
  let FieldContainer = ({
    className,
    column,
    showValidate,
    isRoot,
    hidden,
    props,
    showDescIcon,
    width,
    disabled,
    readonly,
    options,
    schema,
    ...rest
  }) => {
    const {
      displayType,
      value,
      rootValue = {},
      formData = {},
      dependShow,
    } = rest;
    // every key of schema, disabled, readonly, options, hidden, support for function expression
    const convertValue = item => {
      if (typeof item === 'function') {
        return item(value, rootValue, formData);
      } else if (typeof item === 'string' && item.substring(0, 1) === '@') {
        const _item = item.substring(1);
        try {
          return parseString(_item, value, rootValue, formData);
        } catch (error) {
          console.error(error.message);
          console.error(`happen at ${item}`);
          return item;
        }
      }
      return item;
    };

    hidden = convertValue(hidden);
    disabled = convertValue(disabled);
    readonly = convertValue(readonly);
    options = convertValue(options);
    // iterate over schema, and convert every key
    let _schema = { ...schema };
    Object.keys(schema).forEach(key => {
      _schema[key] = convertValue(schema[key]);
    });

    // "ui:hidden": true, hide formItem
    // after "convertValue" being stable, this api will be discarded
    if (hidden && isHidden({ hidden, rootValue, formData })) {
      return null;
    }

    // 传入组件的值
    const _rest = {
      ...rest,
      schema: _schema,
      disabled,
      readonly,
      options,
      formData: formData || {},
      rootValue: rootValue || {},
    };

    // 不建议使用ui:dependShow, 一般一律使用ui:hidden。ui:dependShow可以做复杂、跨结构的校验
    if (isDependShow({ formData, dependShow })) {
      return null;
    }
    const isComplex =
      _schema.type === 'object' ||
      (_schema.type === 'array' && _schema.enum === undefined);

    const validateText = getValidateText(_rest);

    // 必填*，label，描述，竖排时的校验语，只要存在一个，label就不为空
    const showLabel =
      _schema.title ||
      rest.description ||
      rest.required ||
      (displayType !== 'row' && showValidate && validateText);

    let columnStyle = {};
    if (!isComplex && width) {
      columnStyle = {
        width,
        paddingRight: '24px',
      };
    } else if (!isComplex && column > 1) {
      columnStyle = {
        width: `calc(100% /${column})`,
        paddingRight: '24px',
      };
    }

    const fieldProps = {
      className,
      columnStyle,
      displayType,
      isComplex,
      isRequired: rest.required,
      isRoot,
      schema: _schema,
      showDescIcon,
      showLabel,
      showValidate,
      validateText,
    };
    return (
      <FieldUI {...fieldProps}>
        <Widget {..._rest} />
      </FieldUI>
    );
  };
  FieldContainer.propTypes = {
    showValidate: PropTypes.bool,
    column: PropTypes.number,
    isRoot: PropTypes.bool,
    props: PropTypes.object,
    showDescIcon: PropTypes.bool,
    displayType: PropTypes.string,
  };

  FieldContainer.defaultProps = {
    showValidate: true,
    column: 1,
    isRoot: false,
    props: {},
    showDescIcon: false,
    displayType: 'column',
  };

  return FieldContainer;
};

export const DefaultFieldUI = ({
  children,
  className,
  columnStyle, // 处理组件宽度，外部一般不需修改
  displayType, // 展示方式：row 横 column 竖
  isComplex, // 是否是复杂结构：对象和对象数组
  isRequired, // 是否是必填项
  isRoot,
  schema,
  showDescIcon,
  showLabel, // 是否展示label
  showValidate, // 是否展示校验
  validateText, // 校验文字
}) => {
  const { title } = schema;
  // field 整体 label 标签 content 内容
  const { type, enum: _enum, description = '' } = schema;
  let fieldClass = `fr-field w-100 ${isComplex ? 'fr-field-complex' : ''}`;
  let labelClass = 'fr-label flex mb2';
  let contentClass = 'fr-content';

  switch (type) {
    case 'object':
      if (title) {
        labelClass += ' fr-label-object bb b--black-20 pb2 mt2 mb3'; // fr-label-object 无默认style，只是占位用于使用者样式覆盖
      }
      if (!isRoot) {
        fieldClass += ' fr-field-object'; // object的margin bottom由内部元素撑起
        if (title) {
          contentClass += ' ml3'; // 缩进
        }
      }
      break;
    case 'array':
      if (title && !_enum) {
        labelClass += ' mt2 mb3';
      }
      break;
    case 'boolean':
      if (title) {
        labelClass += ' ml2';
        if (displayType === 'row') {
          labelClass = labelClass.replace('mb2', 'mb0');
        }
      }
      fieldClass += ' flex flex-row-reverse justify-end';
      break;
    default:
      if (displayType === 'row') {
        labelClass = labelClass.replace('mb2', 'mb0');
      }
  }
  // 横排时
  if (displayType === 'row' && !isComplex && type !== 'boolean') {
    fieldClass += ' flex items-center';
    labelClass += ' flex-shrink-0 fr-label-row mr2';
    labelClass = labelClass.replace('mb2', 'mb0');
    contentClass += ' flex-grow-1 relative';
  }
  return (
    <div
      className={className ? `${className} ${fieldClass}` : fieldClass}
      style={columnStyle}
    >
      {showLabel && (
        <label className={labelClass} title={title}>
          {isRequired && <span className="fr-label-required"> *</span>}
          <span className={isComplex ? 'b' : ''}>{title}</span>
          {description &&
            (showDescIcon ? (
              <span className="fr-tooltip-toggle" aria-label={description}>
                <i className="fr-tooltip-icon" />
                <div className="fr-tooltip-container">
                  <i className="fr-tooltip-triangle" />
                  {description}
                </div>
              </span>
            ) : (
              <span className="fr-desc ml2">(&nbsp;{description}&nbsp;)</span>
            ))}
          {displayType !== 'row' && showValidate && validateText && (
            <span className="fr-validate">{validateText}</span>
          )}
        </label>
      )}
      <div className={contentClass}>
        <div className={`flex ${isComplex ? 'flex-column' : 'items-center'}`}>
          {children}
        </div>
        {displayType === 'row' && showValidate && validateText && (
          <span className="fr-validate absolute">{validateText}</span>
        )}
      </div>
    </div>
  );
};
