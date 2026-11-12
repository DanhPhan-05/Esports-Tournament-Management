import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Button } from './ui';
export function RichTextEditor({
  value,
  onChange,
  variables,
  label = 'Nội dung mẫu thông báo',
}: {
  value: string;
  onChange: (html: string) => void;
  variables: string[];
  label?: string;
}) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value,
    editorProps: {
      attributes: { 'aria-label': label, role: 'textbox', 'aria-multiline': 'true' },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });
  return (
    <div className="rich-editor">
      <div className="editor-toolbar" aria-label="Định dạng văn bản">
        <Button variant="secondary" type="button" onClick={() => editor?.chain().focus().toggleBold().run()}>
          Đậm
        </Button>
        <Button
          variant="secondary"
          type="button"
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        >
          Nghiêng
        </Button>
        <Button
          variant="secondary"
          type="button"
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        >
          Danh sách
        </Button>
        <Button
          variant="secondary"
          type="button"
          onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          Tiêu đề
        </Button>
        {variables
          .filter((v) => /^\w+$/.test(v))
          .map((v) => (
            <Button
              variant="ghost"
              type="button"
              key={v}
              onClick={() => editor?.chain().focus().insertContent(`{{${v}}}`).run()}
            >{`{{${v}}}`}</Button>
          ))}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
