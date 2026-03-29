Imports System.Drawing

Public Class frmAnalyze
    Private root As WNode
    Private selectedNode As WNode

    Private Sub frmAnalyze_Load(sender As Object, e As EventArgs) Handles MyBase.Load
        Dim args = Environment.GetCommandLineArgs()
        Dim runSmokeTest As Boolean = False
        For Each arg In args
            If String.Equals(arg, "--tree-smoke-test", StringComparison.OrdinalIgnoreCase) Then
                runSmokeTest = True
                Exit For
            End If
        Next

        If runSmokeTest Then
            Dim report = modTreeHarness.RunTreeLayoutSmokeTest(pnlCanvas.Width, pnlCanvas.Height, chkCompactMode.Checked)
            MessageBox.Show(report, "Tree Smoke Test", MessageBoxButtons.OK, MessageBoxIcon.Information)
            Me.Close()
            Return
        End If
    End Sub

    Private Sub btnAddRoot_Click(sender As Object, e As EventArgs) Handles btnAddRoot.Click
        root = New WNode("Root", Nothing)
        selectedNode = root
        pnlCanvas.Invalidate()
    End Sub

    Private Sub btnAddChild_Click(sender As Object, e As EventArgs) Handles btnAddChild.Click
        If selectedNode Is Nothing Then
            MessageBox.Show("Please select a node first.", "Error", MessageBoxButtons.OK, MessageBoxIcon.Error)
            Return
        End If

        Dim newNode As New WNode(txtNodeLabel.Text, selectedNode)
        selectedNode.Children.Add(newNode)
        pnlCanvas.Invalidate()
    End Sub

    Private Sub pnlCanvas_Paint(sender As Object, e As PaintEventArgs) Handles pnlCanvas.Paint
        If root Is Nothing Then Return

        ' Clear the canvas first
        e.Graphics.Clear(pnlCanvas.BackColor)

        ' Set spacing values based on compact mode - much tighter horizontal packing
        Dim horizontalSpacing As Integer = If(chkCompactMode.Checked, 8, 30)
        Dim verticalSpacing As Integer = If(chkCompactMode.Checked, 55, 70)

        ' Calculate initial layout
        modTree.LayoutTree(root, pnlCanvas.Width \ 2, 50, horizontalSpacing, verticalSpacing, chkCompactMode.Checked)

        ' Adjust for overlaps
        modTree.AdjustOffsets(root, horizontalSpacing)

        ' Make sure the entire tree is visible within the panel
        modTree.EnsureTreeInBounds(root, 20, 20, pnlCanvas.Width - 40, pnlCanvas.Height - 40)

        ' Use antialiasing for smoother lines
        e.Graphics.SmoothingMode = Drawing2D.SmoothingMode.AntiAlias

        ' Draw the tree
        DrawTree(e.Graphics, root)
    End Sub

    Private Sub DrawTree(g As Graphics, node As WNode)
        If node Is Nothing Then Return

        ' Draw lines to children first (so they appear behind nodes)
        For Each child In node.Children
            ' Calculate line start/end points from center of nodes
            Dim startX As Integer = node.Position.X + (node.Width \ 2)
            Dim startY As Integer = node.Position.Y + node.Height
            Dim endX As Integer = child.Position.X + (child.Width \ 2)
            Dim endY As Integer = child.Position.Y

            ' Use a slight curve for the connecting lines
            Dim midY As Integer = startY + ((endY - startY) \ 2)

            ' Create a path for a curved line
            Dim linePath As New Drawing2D.GraphicsPath()
            linePath.AddLine(startX, startY, startX, midY)
            linePath.AddLine(startX, midY, endX, midY)
            linePath.AddLine(endX, midY, endX, endY)

            ' Draw the path
            g.DrawPath(New Pen(Color.Black, 1.5F), linePath)

            ' Draw arrow at the end
            Dim arrowSize As Integer = 6
            Dim arrowPoints() As Point = {
                New Point(endX, endY),
                New Point(endX - arrowSize, endY - arrowSize),
                New Point(endX + arrowSize, endY - arrowSize)
            }
            g.FillPolygon(Brushes.Black, arrowPoints)

            ' Recursively draw each child
            DrawTree(g, child)
        Next

        ' Draw the node rectangle with rounded corners
        Dim rect As New Rectangle(node.Position.X, node.Position.Y, node.Width, node.Height)
        Dim cornerRadius As Integer = 8
        Dim nodePath As New Drawing2D.GraphicsPath()

        ' Create rounded rectangle path
        nodePath.AddArc(rect.X, rect.Y, cornerRadius * 2, cornerRadius * 2, 180, 90)
        nodePath.AddArc(rect.Right - cornerRadius * 2, rect.Y, cornerRadius * 2, cornerRadius * 2, 270, 90)
        nodePath.AddArc(rect.Right - cornerRadius * 2, rect.Bottom - cornerRadius * 2, cornerRadius * 2, cornerRadius * 2, 0, 90)
        nodePath.AddArc(rect.X, rect.Bottom - cornerRadius * 2, cornerRadius * 2, cornerRadius * 2, 90, 90)
        nodePath.CloseFigure()

        ' Fill and draw the node
        Dim fillBrush As Brush = If(node Is selectedNode, Brushes.Orange, Brushes.LightBlue)
        g.FillPath(fillBrush, nodePath)
        g.DrawPath(New Pen(Color.Black, 1.5F), nodePath)

        ' Draw the node text
        Dim format As New StringFormat()
        format.Alignment = StringAlignment.Center
        format.LineAlignment = StringAlignment.Center
        g.DrawString(node.Label, New Font("Arial", 9, FontStyle.Bold), Brushes.Black, rect, format)
    End Sub

    Private Sub pnlCanvas_MouseClick(sender As Object, e As MouseEventArgs) Handles pnlCanvas.MouseClick
        selectedNode = FindNodeAtPosition(root, e.Location)
        pnlCanvas.Invalidate()
    End Sub

    Private Function FindNodeAtPosition(node As WNode, position As Point) As WNode
        If node Is Nothing Then Return Nothing

        Dim rect As New Rectangle(node.Position, New Size(node.Width, node.Height))
        If rect.Contains(position) Then Return node

        For Each child In node.Children
            Dim found = FindNodeAtPosition(child, position)
            If found IsNot Nothing Then Return found
        Next

        Return Nothing
    End Function

    Private Sub chkCompactMode_CheckedChanged(sender As Object, e As EventArgs) Handles chkCompactMode.CheckedChanged
        ' Redraw the tree when compact mode is toggled
        pnlCanvas.Invalidate()
    End Sub
End Class
