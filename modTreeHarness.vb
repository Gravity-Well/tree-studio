Imports System.Text

Module modTreeHarness
    Public Function RunTreeLayoutSmokeTest(canvasWidth As Integer, canvasHeight As Integer, compactMode As Boolean) As String
        Dim root = BuildSampleTree()

        Dim horizontalSpacing As Integer = If(compactMode, 8, 30)
        Dim verticalSpacing As Integer = If(compactMode, 55, 70)

        modTree.LayoutTree(root, canvasWidth \ 2, 50, horizontalSpacing, verticalSpacing, compactMode)
        modTree.AdjustOffsets(root, horizontalSpacing)
        modTree.EnsureTreeInBounds(root, 20, 20, canvasWidth - 40, canvasHeight - 40)

        Dim sb As New StringBuilder()
        sb.AppendLine("Tree Layout Smoke Test")
        sb.AppendLine($"compactMode={compactMode}")
        sb.AppendLine($"canvas={canvasWidth}x{canvasHeight}")
        AppendNodePositions(root, sb, 0)

        Dim overlapCount = CountNodeOverlaps(root)
        sb.AppendLine($"overlaps={overlapCount}")
        sb.AppendLine(If(overlapCount = 0, "result=PASS", "result=FAIL"))

        Return sb.ToString()
    End Function

    Private Function BuildSampleTree() As WNode
        Dim root As New WNode("Root", Nothing)

        Dim a As New WNode("A", root)
        Dim b As New WNode("B", root)
        Dim c As New WNode("C", root)
        root.Children.Add(a)
        root.Children.Add(b)
        root.Children.Add(c)

        AddChild(a, "A1")
        AddChild(a, "A2")

        Dim b1 = AddChild(b, "B1")
        AddChild(b, "B2")
        AddChild(b1, "B1a")
        AddChild(b1, "B1b")

        AddChild(c, "C1")
        AddChild(c, "C2")
        AddChild(c, "C3")

        Return root
    End Function

    Private Function AddChild(parent As WNode, label As String) As WNode
        Dim child As New WNode(label, parent)
        parent.Children.Add(child)
        Return child
    End Function

    Private Sub AppendNodePositions(node As WNode, sb As StringBuilder, depth As Integer)
        If node Is Nothing Then Return

        sb.AppendLine($"{New String(" "c, depth * 2)}{node.Label}: ({node.Position.X},{node.Position.Y})")
        For Each child In node.Children
            AppendNodePositions(child, sb, depth + 1)
        Next
    End Sub

    Private Function CountNodeOverlaps(root As WNode) As Integer
        Dim levels As New Dictionary(Of Integer, List(Of WNode))()
        CollectByLevel(root, 0, levels)

        Dim overlaps As Integer = 0
        For Each levelNodes In levels.Values
            For i = 0 To levelNodes.Count - 2
                For j = i + 1 To levelNodes.Count - 1
                    Dim left = levelNodes(i)
                    Dim right = levelNodes(j)
                    If HorizontalOverlap(left, right) Then
                        overlaps += 1
                    End If
                Next
            Next
        Next
        Return overlaps
    End Function

    Private Sub CollectByLevel(node As WNode, level As Integer, levels As Dictionary(Of Integer, List(Of WNode)))
        If node Is Nothing Then Return

        If Not levels.ContainsKey(level) Then
            levels(level) = New List(Of WNode)()
        End If
        levels(level).Add(node)

        For Each child In node.Children
            CollectByLevel(child, level + 1, levels)
        Next
    End Sub

    Private Function HorizontalOverlap(a As WNode, b As WNode) As Boolean
        Dim aLeft = a.Position.X
        Dim aRight = a.Position.X + a.Width
        Dim bLeft = b.Position.X
        Dim bRight = b.Position.X + b.Width

        Return Not (aRight <= bLeft OrElse bRight <= aLeft)
    End Function
End Module
