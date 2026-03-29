Module modTree
    ''' <summary>
    ''' Positions all nodes in the tree starting from the root
    ''' </summary>
    Public Sub LayoutTree(node As WNode, centerX As Integer, y As Integer, xOffset As Integer, yOffset As Integer, Optional compactMode As Boolean = False)
        If node Is Nothing Then Return

        ' Position the current node
        node.Position = New Point(centerX - (node.Width \ 2), y)

        ' Get child count and calculate total width required
        Dim childCount As Integer = node.Children.Count
        If childCount = 0 Then Return ' No children, no further layout needed

        ' In compact mode, use very tight horizontal spacing but prevent overlaps
        Dim actualXOffset As Integer = xOffset
        If compactMode Then
            ' Very tight horizontal spacing - nodes are 100px wide, minimum safe gap
            If childCount > 3 Then
                actualXOffset = Math.Max(5, xOffset \ 4)
            ElseIf childCount > 1 Then
                actualXOffset = Math.Max(6, xOffset \ 3)
            End If
        End If

        ' Calculate total width needed for all children
        Dim totalChildWidth As Integer = 0
        For Each child In node.Children
            totalChildWidth += child.Width
        Next
        totalChildWidth += (childCount - 1) * actualXOffset ' Add spacing between children

        ' Determine starting X position for first child
        Dim startX As Integer = centerX - (totalChildWidth \ 2)

        ' Layout children with adaptive vertical spacing
        Dim actualYOffset As Integer = yOffset
        If compactMode Then
            ' Use tighter vertical spacing but ensure no overlap (nodes are 50px tall + 5px margin)
            actualYOffset = Math.Max(55, yOffset - 15) ' Safe vertical spacing
        End If

        For Each child In node.Children
            Dim childCenterX As Integer = startX + (child.Width \ 2)
            LayoutTree(child, childCenterX, y + actualYOffset, xOffset, yOffset, compactMode)
            startX += child.Width + actualXOffset
        Next
    End Sub

    ''' <summary>
    ''' Gets the depth of a node from the root
    ''' </summary>
    Private Function GetNodeDepth(node As WNode) As Integer
        Dim depth As Integer = 0
        Dim current As WNode = node
        While current.Parent IsNot Nothing
            depth += 1
            current = current.Parent
        End While
        Return depth
    End Function

    ''' <summary>
    ''' Adjusts tree to prevent node overlaps
    ''' </summary>
    Public Sub AdjustOffsets(node As WNode, minOffset As Integer)
        If node Is Nothing OrElse node.Children.Count <= 1 Then Return

        ' First, recursively adjust each child's subtree
        For Each child In node.Children
            AdjustOffsets(child, minOffset)
        Next

        ' Then adjust siblings at this level
        Dim needsAnotherPass As Boolean
        Do
            needsAnotherPass = False
            For i = 1 To node.Children.Count - 1
                Dim leftChild = node.Children(i - 1)
                Dim rightChild = node.Children(i)

                ' First check if the nodes themselves overlap (not their subtrees)
                Dim leftNodeRight = leftChild.Position.X + leftChild.Width
                Dim rightNodeLeft = rightChild.Position.X
                Dim nodeGap = rightNodeLeft - leftNodeRight

                ' Use adaptive spacing at every level so tighter layouts are allowed
                ' whenever sibling subtrees can safely pack closer together.
                Dim dynamicMinOffset As Integer = GetDynamicMinOffset(leftChild, rightChild, minOffset)

                ' Only move if nodes themselves are too close OR subtrees actually overlap
                Dim overlap As Integer = 0
                If nodeGap < dynamicMinOffset Then
                    ' Nodes themselves are too close
                    overlap = dynamicMinOffset - nodeGap
                Else
                    ' Keep spacing between sibling subtrees on matching Y-levels only.
                    ' This allows tighter vertical stacking (for example B2 over B1c)
                    ' while still preventing collisions within the same visual row.
                    Dim rowOverlap As Integer = 0
                    Dim rightLevels As New HashSet(Of Integer)
                    CollectYLevels(rightChild, rightLevels)

                    For Each levelY In rightLevels
                        Dim leftRowRight = GetRightmostEdgeAtY(leftChild, levelY)
                        Dim rightRowLeft = GetLeftmostEdgeAtY(rightChild, levelY)
                        If leftRowRight <> Integer.MinValue AndAlso rightRowLeft <> Integer.MaxValue Then
                            Dim currentRowOverlap = (leftRowRight + dynamicMinOffset) - rightRowLeft
                            If currentRowOverlap > rowOverlap Then
                                rowOverlap = currentRowOverlap
                            End If
                        End If
                    Next

                    If rowOverlap > 0 Then
                        overlap = rowOverlap
                    End If
                End If

                If overlap > 0 Then
                    ' Shift the right subtree
                    ShiftSubtree(rightChild, overlap)
                    needsAnotherPass = True ' We made a change, so we might need another pass
                End If
            Next
        Loop While needsAnotherPass

        ' Also resolve overlaps between non-adjacent sibling subtrees.
        ResolveNonAdjacentSiblingOverlaps(node, minOffset)

        ' Apply tight column alignment across adjacent sibling subtrees
        AlignNestedColumns(node)

        ' Final direct-sibling safety pass to prevent any residual intersections.
        EnforceSiblingNodeGap(node, minOffset)

        ' Center parent above children if needed
        CenterParentAboveChildren(node)
    End Sub

    ''' <summary>
    ''' Checks if a subtree is simple (node has no grandchildren)
    ''' </summary>
    Private Function IsSimpleSubtree(node As WNode) As Boolean
        If node Is Nothing Then Return True
        
        For Each child In node.Children
            If child.Children.Count > 0 Then
                Return False
            End If
        Next
        
        Return True
    End Function

    Private Function GetDynamicMinOffset(leftChild As WNode, rightChild As WNode, baseMinOffset As Integer) As Integer
        ' Keep full spacing for branch-to-branch siblings.
        ' Apply tighter packing only when both siblings are leaves.
        If leftChild.Children.Count > 0 OrElse rightChild.Children.Count > 0 Then
            Return baseMinOffset
        End If

        Dim leftSimple = IsSimpleSubtree(leftChild)
        Dim rightSimple = IsSimpleSubtree(rightChild)

        If leftSimple AndAlso rightSimple Then
            Return Math.Max(4, baseMinOffset \ 2)
        End If

        Return Math.Max(5, (baseMinOffset * 2) \ 3)
    End Function

    Private Function GetRowOverlap(leftChild As WNode, rightChild As WNode, minGap As Integer) As Integer
        Dim rowOverlap As Integer = 0
        Dim rightLevels As New HashSet(Of Integer)
        CollectYLevels(rightChild, rightLevels)

        For Each levelY In rightLevels
            Dim leftRowRight = GetRightmostEdgeAtY(leftChild, levelY)
            Dim rightRowLeft = GetLeftmostEdgeAtY(rightChild, levelY)
            If leftRowRight <> Integer.MinValue AndAlso rightRowLeft <> Integer.MaxValue Then
                Dim currentRowOverlap = (leftRowRight + minGap) - rightRowLeft
                If currentRowOverlap > rowOverlap Then
                    rowOverlap = currentRowOverlap
                End If
            End If
        Next

        Return rowOverlap
    End Function

    Private Sub ResolveNonAdjacentSiblingOverlaps(node As WNode, minOffset As Integer)
        If node Is Nothing OrElse node.Children.Count <= 2 Then Return

        Dim changed As Boolean
        Do
            changed = False

            For i = 0 To node.Children.Count - 3
                For j = i + 2 To node.Children.Count - 1
                    Dim leftChild = node.Children(i)
                    Dim rightChild = node.Children(j)
                    Dim dynamicMinOffset = GetDynamicMinOffset(leftChild, rightChild, minOffset)
                    Dim overlap = GetRowOverlap(leftChild, rightChild, dynamicMinOffset)

                    If overlap > 0 Then
                        ShiftSubtree(rightChild, overlap)
                        changed = True
                    End If
                Next
            Next
        Loop While changed
    End Sub

    Private Sub EnforceSiblingNodeGap(node As WNode, minOffset As Integer)
        If node Is Nothing OrElse node.Children.Count <= 1 Then Return

        Dim changed As Boolean
        Do
            changed = False
            For i = 1 To node.Children.Count - 1
                Dim leftChild = node.Children(i - 1)
                Dim rightChild = node.Children(i)
                Dim requiredGap = GetDynamicMinOffset(leftChild, rightChild, minOffset)
                Dim currentGap = rightChild.Position.X - (leftChild.Position.X + leftChild.Width)
                If currentGap < requiredGap Then
                    ShiftSubtree(rightChild, requiredGap - currentGap)
                    changed = True
                End If
            Next
        Loop While changed
    End Sub

    Private Sub AlignNestedColumns(node As WNode)
        If node Is Nothing OrElse node.Children.Count <= 1 Then Return
        If node.Children.Count > 3 Then Return

        For i = 1 To node.Children.Count - 1
            Dim leftChild = node.Children(i - 1)
            Dim rightChild = node.Children(i)

            ' Only apply nested column packing on broader sibling groups.
            ' Small groups (like D -> D1, D2) should keep normal branch geometry.
            If rightChild.Children.Count < 3 Then Continue For

            Dim nestedTarget = GetLeftmostNodeBelowY(rightChild, rightChild.Position.Y)
            If nestedTarget Is Nothing OrElse nestedTarget.Parent Is Nothing Then Continue For
            If nestedTarget.Parent Is rightChild Then Continue For

            Dim anchorY = nestedTarget.Parent.Position.Y
            Dim anchor = GetRightmostNodeAtY(leftChild, anchorY)
            If anchor Is Nothing Then Continue For

            Dim anchorCenter = anchor.Position.X + (anchor.Width \ 2)
            Dim targetCenter = nestedTarget.Position.X + (nestedTarget.Width \ 2)
            Dim shift = anchorCenter - targetCenter
            If shift <> 0 Then
                ShiftChildrenOfNode(nestedTarget.Parent, shift)
                SnapParentToMiddleChild(nestedTarget.Parent)
            End If
        Next
    End Sub

    Private Sub ShiftChildrenOfNode(node As WNode, shiftAmount As Integer)
        If node Is Nothing OrElse shiftAmount = 0 Then Return

        For Each child In node.Children
            ShiftSubtree(child, shiftAmount)
        Next
    End Sub

    Private Sub SnapParentToMiddleChild(node As WNode)
        If node Is Nothing Then Return
        If node.Children.Count = 0 Then Return
        If (node.Children.Count Mod 2) = 0 Then Return

        Dim middleIndex = node.Children.Count \ 2
        Dim middleChild = node.Children(middleIndex)
        Dim middleCenter = middleChild.Position.X + (middleChild.Width \ 2)
        node.Position = New Point(middleCenter - (node.Width \ 2), node.Position.Y)
    End Sub

    Private Function GetRightmostNodeAtY(node As WNode, targetY As Integer) As WNode
        If node Is Nothing Then Return Nothing

        Dim bestNode As WNode = Nothing
        If node.Position.Y = targetY Then
            bestNode = node
        End If

        For Each child In node.Children
            Dim candidate = GetRightmostNodeAtY(child, targetY)
            If candidate IsNot Nothing Then
                If bestNode Is Nothing OrElse candidate.Position.X > bestNode.Position.X Then
                    bestNode = candidate
                End If
            End If
        Next

        Return bestNode
    End Function

    Private Function GetLeftmostNodeBelowY(node As WNode, minExclusiveY As Integer) As WNode
        If node Is Nothing Then Return Nothing

        Dim bestNode As WNode = Nothing
        If node.Position.Y > minExclusiveY Then
            bestNode = node
        End If

        For Each child In node.Children
            Dim candidate = GetLeftmostNodeBelowY(child, minExclusiveY)
            If candidate IsNot Nothing Then
                If bestNode Is Nothing OrElse candidate.Position.X < bestNode.Position.X OrElse
                   (candidate.Position.X = bestNode.Position.X AndAlso candidate.Position.Y < bestNode.Position.Y) Then
                    bestNode = candidate
                End If
            End If
        Next

        Return bestNode
    End Function

    Private Sub CollectYLevels(node As WNode, levels As HashSet(Of Integer))
        If node Is Nothing Then Return
        levels.Add(node.Position.Y)
        For Each child In node.Children
            CollectYLevels(child, levels)
        Next
    End Sub

    Private Function GetRightmostEdgeAtY(node As WNode, targetY As Integer) As Integer
        If node Is Nothing Then Return Integer.MinValue

        Dim best As Integer = Integer.MinValue
        If node.Position.Y = targetY Then
            best = node.Position.X + node.Width
        End If

        For Each child In node.Children
            Dim childBest = GetRightmostEdgeAtY(child, targetY)
            If childBest > best Then
                best = childBest
            End If
        Next

        Return best
    End Function

    Private Function GetLeftmostEdgeAtY(node As WNode, targetY As Integer) As Integer
        If node Is Nothing Then Return Integer.MaxValue

        Dim best As Integer = Integer.MaxValue
        If node.Position.Y = targetY Then
            best = node.Position.X
        End If

        For Each child In node.Children
            Dim childBest = GetLeftmostEdgeAtY(child, targetY)
            If childBest < best Then
                best = childBest
            End If
        Next

        Return best
    End Function

    ''' <summary>
    ''' Gets the rightmost edge (x-coordinate) of a node and its subtree
    ''' </summary>
    Private Function GetRightmostEdge(node As WNode) As Integer
        If node Is Nothing Then Return 0

        Dim nodeRightEdge = node.Position.X + node.Width

        ' Check if any child extends beyond this node
        For Each child In node.Children
            Dim childRightEdge = GetRightmostEdge(child)
            If childRightEdge > nodeRightEdge Then
                nodeRightEdge = childRightEdge
            End If
        Next

        Return nodeRightEdge
    End Function

    ''' <summary>
    ''' Gets the leftmost edge (x-coordinate) of a node and its subtree
    ''' </summary>
    Private Function GetLeftmostEdge(node As WNode) As Integer
        If node Is Nothing Then Return Integer.MaxValue

        Dim nodeLeftEdge = node.Position.X

        ' Check if any child extends beyond this node
        For Each child In node.Children
            Dim childLeftEdge = GetLeftmostEdge(child)
            If childLeftEdge < nodeLeftEdge Then
                nodeLeftEdge = childLeftEdge
            End If
        Next

        Return nodeLeftEdge
    End Function

    ''' <summary>
    ''' Only moves parent if there's risk of overlap with children
    ''' </summary>
    Private Sub CenterParentAboveChildren(node As WNode)
        If node Is Nothing OrElse node.Children.Count = 0 Then Return

        ' Center parent over direct child row (not descendants),
        ' so deeper grandchildren do not skew branch headers.
        Dim firstChild = node.Children.First()
        Dim lastChild = node.Children.Last()
        Dim childrenLeft = firstChild.Position.X
        Dim childrenRight = lastChild.Position.X + lastChild.Width
        Dim midpoint = childrenLeft + ((childrenRight - childrenLeft) \ 2)
        node.Position = New Point(midpoint - (node.Width \ 2), node.Position.Y)
    End Sub

    ''' <summary>
    ''' Shifts a node and its entire subtree by the specified amount
    ''' </summary>
    Private Sub ShiftSubtree(node As WNode, shiftAmount As Integer)
        If node Is Nothing Then Return

        ' Shift the current node
        node.Position = New Point(node.Position.X + shiftAmount, node.Position.Y)

        ' Shift all children recursively
        For Each child In node.Children
            ShiftSubtree(child, shiftAmount)
        Next
    End Sub

    ''' <summary>
    ''' Ensures the entire tree is visible within the specified bounds
    ''' </summary>
    Public Sub EnsureTreeInBounds(root As WNode, minX As Integer, minY As Integer,
                                 maxWidth As Integer, maxHeight As Integer)
        If root Is Nothing Then Return

        ' Get the bounds of the entire tree
        Dim leftEdge = GetLeftmostEdge(root)
        Dim rightEdge = GetRightmostEdge(root)
        Dim treeWidth = rightEdge - leftEdge

        ' If tree is wider than available space, scale down
        If treeWidth > maxWidth Then
            ' TODO: Implement scaling logic if needed
        End If

        ' If tree is outside left boundary, shift right
        If leftEdge < minX Then
            ShiftSubtree(root, minX - leftEdge)
        End If

        ' If tree is outside right boundary, shift left
        Dim rightBoundary = minX + maxWidth
        If rightEdge > rightBoundary Then
            ShiftSubtree(root, rightBoundary - rightEdge)
        End If
    End Sub
End Module
