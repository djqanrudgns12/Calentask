// @ts-nocheck
import TableCell from '@tiptap/extension-table-cell';

export const CustomTableCell = TableCell.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      backgroundColor: {
        default: null,
        parseHTML: element => element.getAttribute('data-background-color'),
        renderHTML: attributes => {
          if (!attributes.backgroundColor) return {};
          return {
            'data-background-color': attributes.backgroundColor,
            style: `background-color: ${attributes.backgroundColor}`,
          };
        },
      },
      borderWidth: {
        default: null,
        parseHTML: element => element.getAttribute('data-border-width'),
        renderHTML: attributes => {
          if (!attributes.borderWidth) return {};
          return {
            'data-border-width': attributes.borderWidth,
            style: `border-width: ${attributes.borderWidth}`,
          };
        },
      },
      borderStyle: {
        default: null,
        parseHTML: element => element.getAttribute('data-border-style'),
        renderHTML: attributes => {
          if (!attributes.borderStyle) return {};
          return {
            'data-border-style': attributes.borderStyle,
            style: `border-style: ${attributes.borderStyle}`,
          };
        },
      },
      borderColor: {
        default: null,
        parseHTML: element => element.getAttribute('data-border-color'),
        renderHTML: attributes => {
          if (!attributes.borderColor) return {};
          return {
            'data-border-color': attributes.borderColor,
            style: `border-color: ${attributes.borderColor}`,
          };
        },
      },
    };
  },
});
